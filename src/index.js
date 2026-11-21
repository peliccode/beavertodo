require("dotenv").config();

const path = require("node:path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  escapeMarkdown,
} = require("discord.js");
const { TodoStore } = require("./store");

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.PREFIX || "!";
const maximumTodos = 50;
const store = new TodoStore(path.join(__dirname, "..", "data", "todos.json"));

if (!token) {
  console.error("DISCORD_TOKEN is missing. Copy .env.example to .env and add your token.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function listView(guildId, notice) {
  const todos = store.list(guildId);
  const completed = todos.filter((todo) => todo.completed).length;
  const lines = todos.map((todo, index) => {
    const marker = todo.completed ? "✅" : "⬜";
    const escaped = escapeMarkdown(todo.text);
    const text = escaped.length > 140 ? `${escaped.slice(0, 137)}...` : escaped;
    return `${marker} **${index + 1}.** ${todo.completed ? `~~${text}~~` : text}`;
  });

  const embed = new EmbedBuilder()
    .setColor(completed === todos.length && todos.length > 0 ? 0x57f287 : 0x5865f2)
    .setTitle("📝 Server Todo List")
    .setDescription(lines.join("\n").slice(0, 4096) || "*Nothing here yet — add your first todo!*")
    .addFields({
      name: "Progress",
      value: `${completed}/${todos.length} complete`,
      inline: true,
    })
    .setFooter({ text: notice || "Use the controls below or /add, /complete, and /remove" })
    .setTimestamp();

  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("todo:add")
      .setLabel("Add")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success)
      .setDisabled(todos.length >= maximumTodos),
    new ButtonBuilder()
      .setCustomId("todo:complete")
      .setLabel("Complete")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(todos.length === 0),
    new ButtonBuilder()
      .setCustomId("todo:remove")
      .setLabel("Remove")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(todos.length === 0),
    new ButtonBuilder()
      .setCustomId("todo:refresh")
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("todo:clear")
      .setLabel("Clear done")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(completed === 0),
  );

  return { embeds: [embed], components: [controls], allowedMentions: { parse: [] } };
}

function ensureGuild(context) {
  if (!context.guildId) {
    throw new Error("Todos are shared by a server, so this command cannot be used in DMs.");
  }
}

function cleanTodoText(value) {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) {
    throw new Error("Please provide something to add.");
  }
  if (text.length > 200) {
    throw new Error("A todo can be at most 200 characters.");
  }
  return text;
}

function addTodo(guildId, text, userId) {
  if (store.list(guildId).length >= maximumTodos) {
    throw new Error(`This list is full (${maximumTodos} todos maximum).`);
  }
  return store.add(guildId, cleanTodoText(text), userId);
}

function numberModal(action) {
  const title = action === "complete" ? "Complete a todo" : "Remove a todo";
  return new ModalBuilder()
    .setCustomId(`todo:modal:${action}`)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("number")
          .setLabel("Todo number")
          .setPlaceholder("For example: 2")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(3),
      ),
    );
}

function addModal() {
  return new ModalBuilder()
    .setCustomId("todo:modal:add")
    .setTitle("Add a todo")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("text")
          .setLabel("What needs to be done?")
          .setPlaceholder("Ship the new feature")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(200),
      ),
    );
}

async function sendInteractionError(interaction, error) {
  const message = `⚠️ ${error.message || "Something went wrong."}`;
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content: message, ephemeral: true });
  } else {
    await interaction.reply({ content: message, ephemeral: true });
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Todo bot is online as ${readyClient.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    ensureGuild(interaction);

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "todo") {
        await interaction.reply(listView(interaction.guildId));
        return;
      }

      if (interaction.commandName === "add") {
        const text = interaction.options.getString("thing", true);
        addTodo(interaction.guildId, text, interaction.user.id);
        await interaction.reply(listView(interaction.guildId, `Added by ${interaction.user.displayName}`));
        return;
      }

      const number = interaction.options.getInteger("number", true);
      if (interaction.commandName === "complete") {
        store.complete(interaction.guildId, number);
        await interaction.reply(listView(interaction.guildId, `Todo ${number} completed`));
      } else if (interaction.commandName === "remove") {
        store.remove(interaction.guildId, number);
        await interaction.reply(listView(interaction.guildId, `Todo ${number} removed`));
      }
      return;
    }

    if (interaction.isButton()) {
      const action = interaction.customId.split(":")[1];
      if (action === "add") {
        await interaction.showModal(addModal());
      } else if (action === "complete" || action === "remove") {
        await interaction.showModal(numberModal(action));
      } else if (action === "refresh") {
        await interaction.update(listView(interaction.guildId, `Refreshed by ${interaction.user.displayName}`));
      } else if (action === "clear") {
        const count = store.clearCompleted(interaction.guildId);
        await interaction.update(listView(interaction.guildId, `Cleared ${count} completed todo${count === 1 ? "" : "s"}`));
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      const action = interaction.customId.split(":")[2];
      let notice;

      if (action === "add") {
        addTodo(interaction.guildId, interaction.fields.getTextInputValue("text"), interaction.user.id);
        notice = `Added by ${interaction.user.displayName}`;
      } else {
        const rawNumber = interaction.fields.getTextInputValue("number").trim();
        const number = Number(rawNumber);
        if (!/^\d+$/.test(rawNumber)) {
          throw new Error("Enter a valid todo number.");
        }

        if (action === "complete") {
          store.complete(interaction.guildId, number);
          notice = `Todo ${number} completed`;
        } else {
          store.remove(interaction.guildId, number);
          notice = `Todo ${number} removed`;
        }
      }

      await interaction.update(listView(interaction.guildId, notice));
    }
  } catch (error) {
    console.error(error);
    await sendInteractionError(interaction, error);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guildId || !message.content.startsWith(prefix)) {
    return;
  }

  const input = message.content.slice(prefix.length).trim();
  const [rawCommand, ...argumentsList] = input.split(/\s+/);
  const command = rawCommand?.toLowerCase();
  const argument = argumentsList.join(" ");

  try {
    if (command === "todo") {
      await message.reply(listView(message.guildId));
    } else if (command === "add") {
      addTodo(message.guildId, argument, message.author.id);
      await message.reply(listView(message.guildId, `Added by ${message.author.displayName}`));
    } else if (command === "complete" || command === "remove") {
      const number = Number(argument);
      if (!/^\d+$/.test(argument)) {
        throw new Error(`Usage: ${prefix}${command} <number>`);
      }

      if (command === "complete") {
        store.complete(message.guildId, number);
        await message.reply(listView(message.guildId, `Todo ${number} completed`));
      } else {
        store.remove(message.guildId, number);
        await message.reply(listView(message.guildId, `Todo ${number} removed`));
      }
    }
  } catch (error) {
    await message.reply({
      content: `⚠️ ${error.message}`,
      allowedMentions: { repliedUser: false, parse: [] },
    });
  }
});

client.login(token);
