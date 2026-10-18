import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

let TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
let DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
let DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
let DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
let DISCORD_CATEGORY_ID = process.env.DISCORD_CATEGORY_ID;
let DISCORD_ARCHIVE_CATEGORY_ID = process.env.DISCORD_ARCHIVE_CATEGORY_ID;
let DISCORD_MOD_ROLE_ID = process.env.DISCORD_MOD_ROLE_ID;
const PORT = process.env.PORT || 3000;
let BOT_DISPLAY_NAME = process.env.BOT_DISPLAY_NAME?.trim() || "Nerd Support";

export function applyConfig(values) {
  TELEGRAM_TOKEN = values.telegramToken;
  TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
  DISCORD_TOKEN = values.discordToken;
  DISCORD_GUILD_ID = values.guildId;
  DISCORD_CHANNEL_ID = values.channelId;
  DISCORD_CATEGORY_ID = values.categoryId;
  DISCORD_ARCHIVE_CATEGORY_ID = values.archiveCategoryId;
  DISCORD_MOD_ROLE_ID = values.modRoleId;
  BOT_DISPLAY_NAME = values.botName || "Nerd Support";
}

export function validateConfig() {
  if (!TELEGRAM_TOKEN)
    throw new Error("TELEGRAM_BOT_TOKEN não configurado no arquivo .env");
  if (!DISCORD_TOKEN)
    throw new Error("DISCORD_BOT_TOKEN não configurado no arquivo .env");
}

export {
  TELEGRAM_TOKEN,
  TELEGRAM_API_URL,
  DISCORD_TOKEN,
  DISCORD_CHANNEL_ID,
  DISCORD_GUILD_ID,
  DISCORD_CATEGORY_ID,
  DISCORD_ARCHIVE_CATEGORY_ID,
  DISCORD_MOD_ROLE_ID,
  PORT,
  BOT_DISPLAY_NAME,
};
