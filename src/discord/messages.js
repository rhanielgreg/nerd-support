import { DISCORD_CHANNEL_ID } from "../config.js";
import { discordClient } from "../clients.js";
import { createTicketChannel } from "./channels.js";
import axios from "axios";
import { EmbedBuilder } from "discord.js";

async function sendToDiscord(ticket, message, isNewTicket = false) {
  try {
    console.log(
      `Sending to Discord (Ticket #${ticket.id}): ${message.substring(0, 30)}...`,
    );
    console.log(
      `Detalhes do ticket: ID=${ticket.id}, Status=${ticket.status}, DiscordChannelId=${ticket.discordChannelId || "Nenhum"}`,
    );

    // Verificar se o ticket está fechado
    if (ticket.status === "closed") {
      console.log(`Ticket #${ticket.id} is closed, not sending to Discord`);
      return false;
    }

    let channel;

    // Se o ticket já tem um canal associado, usar esse canal
    if (ticket.discordChannelId) {
      try {
        console.log(
          `Buscando canal do Discord com ID: ${ticket.discordChannelId}`,
        );
        channel = await discordClient.channels.fetch(ticket.discordChannelId);
        console.log(`Canal encontrado: ${channel.name}`);
      } catch (error) {
        console.error(
          `Error fetching channel ${ticket.discordChannelId}:`,
          error,
        );
        channel = null;
      }
    }

    // Se não tem canal ou não foi possível recuperar, criar um novo
    if (!channel && isNewTicket) {
      channel = await createTicketChannel(ticket);
    }

    // Se ainda não tem canal, enviar para o canal padrão
    if (!channel && DISCORD_CHANNEL_ID) {
      try {
        channel = await discordClient.channels.fetch(DISCORD_CHANNEL_ID);
      } catch (error) {
        console.error(
          `Error fetching default channel ${DISCORD_CHANNEL_ID}:`,
          error,
        );
        return false;
      }
    }

    // Se não foi possível obter um canal, falhar
    if (!channel) {
      console.error("No Discord channel available for sending message");
      return false;
    }

    // Se for uma nova mensagem em um ticket existente
    if (!isNewTicket) {
      const embed = new EmbedBuilder()
        .setTitle(`Reply to Ticket #${ticket.id}`)
        .setDescription(message)
        .setColor(0x00ae86)
        .setFooter({ text: `From: ${ticket.username} (${ticket.userId})` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }

    return true;
  } catch (error) {
    console.error("Error sending to Discord:", error);
    return false;
  }
}

async function sendImageToDiscord(
  ticket,
  imageUrl,
  message,
  isNewTicket = false,
) {
  try {
    console.log(`Sending image to Discord (Ticket #${ticket.id})`);

    // Verificar se o ticket está fechado
    if (ticket.status === "closed") {
      console.log(`Ticket #${ticket.id} is closed, not sending to Discord`);
      return false;
    }

    let channel;

    // Se o ticket já tem um canal associado, usar esse canal
    if (ticket.discordChannelId) {
      try {
        channel = await discordClient.channels.fetch(ticket.discordChannelId);
      } catch (error) {
        console.error(
          `Error fetching channel ${ticket.discordChannelId}:`,
          error,
        );
        channel = null;
      }
    }

    // Se não tem canal ou não foi possível recuperar, criar um novo
    if (!channel && isNewTicket) {
      channel = await createTicketChannel(ticket);
    }

    // Se ainda não tem canal, enviar para o canal padrão
    if (!channel && DISCORD_CHANNEL_ID) {
      try {
        channel = await discordClient.channels.fetch(DISCORD_CHANNEL_ID);
      } catch (error) {
        console.error(
          `Error fetching default channel ${DISCORD_CHANNEL_ID}:`,
          error,
        );
        return false;
      }
    }

    // Se não foi possível obter um canal, falhar
    if (!channel) {
      console.error("No Discord channel available for sending message");
      return false;
    }

    // Baixar a imagem
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    // Criar um nome de arquivo baseado no ID do ticket e timestamp
    const timestamp = new Date().getTime();
    const filename = `ticket_${ticket.id}_${timestamp}.jpg`;

    // Criar embed com a imagem
    const embed = new EmbedBuilder()
      .setTitle(`Image from Ticket #${ticket.id}`)
      .setDescription(message || "Image sent by user")
      .setColor(0x00ae86)
      .setFooter({ text: `From: ${ticket.username} (${ticket.userId})` })
      .setImage(`attachment://${filename}`)
      .setTimestamp();

    // Enviar a mensagem com a imagem anexada
    await channel.send({
      embeds: [embed],
      files: [
        {
          attachment: buffer,
          name: filename,
        },
      ],
    });

    return true;
  } catch (error) {
    console.error("Error sending image to Discord:", error);
    return false;
  }
}

export { sendToDiscord, sendImageToDiscord };
