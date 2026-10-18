import { TELEGRAM_TOKEN } from "./config.js";
import { Telegraf } from "telegraf";
import { Client, GatewayIntentBits, Partials } from "discord.js";

let telegramBot = new Telegraf(TELEGRAM_TOKEN);

// Criar cliente Discord
function createDiscordClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });
}
let discordClient = createDiscordClient();

export function resetClients(token) {
  telegramBot = new Telegraf(token);
  discordClient = createDiscordClient();
  discordGuild = null;
  discordChannel = null;
}

let discordGuild = null;
let discordChannel = null;

export function setDiscordGuild(guild) {
  discordGuild = guild;
}
export function setDiscordChannel(channel) {
  discordChannel = channel;
}

export { telegramBot, discordClient, discordGuild, discordChannel };
