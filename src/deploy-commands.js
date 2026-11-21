require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_TOKEN and CLIENT_ID must be set in .env.");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("todo")
    .setDescription("Show the server's interactive todo list"),
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add something to the todo list")
    .addStringOption((option) =>
      option
        .setName("thing")
        .setDescription("What needs to be done")
        .setRequired(true)
        .setMaxLength(200),
    ),
  new SlashCommandBuilder()
    .setName("complete")
    .setDescription("Mark a numbered todo as complete")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("The number shown beside the todo")
        .setRequired(true)
        .setMinValue(1),
    ),
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a numbered todo")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("The number shown beside the todo")
        .setRequired(true)
        .setMinValue(1),
    ),
].map((command) => command.toJSON());

const rest = new REST().setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

(async () => {
  try {
    console.log(`Deploying ${commands.length} ${guildId ? "server" : "global"} slash commands...`);
    await rest.put(route, { body: commands });
    console.log("Slash commands deployed.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
