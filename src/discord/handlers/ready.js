import { DISCORD_CHANNEL_ID, DISCORD_GUILD_ID } from "../../config.js";
import {
  discordClient,
  discordGuild,
  discordChannel,
  setDiscordGuild,
  setDiscordChannel,
} from "../../clients.js";
import { syncWithDiscord } from "../channels.js";

async function handleReady() {
  console.log(`Bot do Discord conectado como ${discordClient.user.tag}`);

  // Obter o servidor Discord
  if (DISCORD_GUILD_ID) {
    try {
      setDiscordGuild(await discordClient.guilds.fetch(DISCORD_GUILD_ID));
      console.log(`Servidor Discord configurado: ${discordGuild.name}`);

      // Sincronizar com o Discord
      await syncWithDiscord();
    } catch (error) {
      console.error("Erro ao obter servidor Discord:", error);
    }
  } else {
    console.warn(
      "DISCORD_GUILD_ID não configurado. Não será possível criar canais automaticamente.",
    );
  }

  // Obter o canal para enviar mensagens (fallback)
  if (DISCORD_CHANNEL_ID) {
    try {
      setDiscordChannel(await discordClient.channels.fetch(DISCORD_CHANNEL_ID));
      console.log(`Canal do Discord configurado: ${discordChannel.name}`);
    } catch (error) {
      console.error("Erro ao obter canal do Discord:", error);
    }
  }
}

export { handleReady };
