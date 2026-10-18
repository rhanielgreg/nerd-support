import { handleReady } from "./handlers/ready.js";
import { handleMessage } from "./handlers/messageCreate.js";
import { handleInteraction } from "./handlers/interactionCreate.js";

function registerDiscordHandlers(discordClient) {
  discordClient.on("ready", handleReady);
  discordClient.on("messageCreate", handleMessage);
  discordClient.on("interactionCreate", handleInteraction);
}

export { registerDiscordHandlers };
