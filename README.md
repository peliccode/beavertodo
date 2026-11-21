# Discord Todo Bot

A shared, persistent todo list for each Discord server. `/todo` opens an embed with buttons that let members add, complete, remove, refresh, and clear completed items without leaving Discord.

## Commands

- `/todo` or `!todo` — show the interactive list
- `/add thing` or `!add thing` — add an item
- `/complete number` or `!complete number` — mark an item done
- `/remove number` or `!remove number` — remove an item

The prefix can be changed with `PREFIX` in `.env`.

## Setup

1. Install [Node.js 20 or newer](https://nodejs.org/).
2. Open the [Discord Developer Portal](https://discord.com/developers/applications), create an application, and add a bot.
3. On the **Bot** page, enable **Message Content Intent**. This is required for `!` commands.
4. On **OAuth2 → URL Generator**, select the `bot` and `applications.commands` scopes. Grant:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
5. Open the generated URL to invite the bot to your server.
6. Copy `.env.example` to `.env`, then fill in:
   - `DISCORD_TOKEN`: token from the application's Bot page
   - `CLIENT_ID`: application ID from General Information
   - `GUILD_ID`: your test server ID (enable Discord Developer Mode, then right-click the server and copy its ID)
7. Install, deploy, and start:

```powershell
npm install
npm run deploy
npm start
```

Keep the `npm start` process running for the bot to stay online. For production, run it on a Node.js host with persistent disk storage.

## Data

Todos are stored by server in `data/todos.json`. The file is created automatically and ignored by git. Back it up if the list is important.

To deploy slash commands globally, remove `GUILD_ID` from `.env` and run `npm run deploy` again. Global command updates can take up to an hour to appear.

## Tests

```powershell
npm test
```
