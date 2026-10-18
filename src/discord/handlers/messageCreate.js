import { DISCORD_ARCHIVE_CATEGORY_ID } from "../../config.js";
import { saveActiveTickets } from "../../storage/tickets.js";
import { getTicketById } from "../../services/tickets.js";
import { sendToTelegramAPI, sendImageToTelegram } from "../../telegram/api.js";

async function handleMessage(message) {
  // Ignorar mensagens do próprio bot
  if (message.author.bot) return;

  // Verificar se a mensagem está em um canal de ticket
  if (!message.channel.name.startsWith("ticket-")) return;

  try {
    console.log(`Message received in Discord channel ${message.channel.name}`);

    // Extrair o ID do ticket do tópico do canal
    const channelTopic = message.channel.topic;
    if (!channelTopic) {
      console.log("Canal sem tópico, ignorando mensagem");
      return;
    }

    console.log(`Tópico do canal: ${channelTopic}`);
    const ticketIdMatch = channelTopic.match(/Ticket #([a-zA-Z0-9_]+)/);
    if (!ticketIdMatch) {
      console.log("ID do ticket não encontrado no tópico do canal");
      return;
    }

    const ticketId = ticketIdMatch[1];
    console.log(`ID do ticket extraído: ${ticketId}`);

    // Buscar o ticket
    const ticket = getTicketById(ticketId);

    // Verificar se o ticket existe
    if (!ticket) {
      // Verificar se o canal está na categoria de arquivados
      const isArchived =
        message.channel.name.startsWith("closed-") ||
        (message.channel.parent &&
          message.channel.parent.id === DISCORD_ARCHIVE_CATEGORY_ID);

      if (isArchived) {
        await message.reply(
          "This ticket is closed. The user will not receive this message.",
        );
      } else {
        await message.reply("This ticket does not exist in the system.");
      }
      return;
    }

    // Verificar se o ticket está fechado
    if (ticket.status === "closed") {
      await message.reply(
        "This ticket is closed. The user will not receive this message.",
      );
      return;
    }

    // Verificar se a mensagem contém anexos (imagens)
    const hasAttachments = message.attachments.size > 0;
    let imageUrl = null;

    if (hasAttachments) {
      // Pegar o primeiro anexo
      const attachment = message.attachments.first();

      // Verificar se é uma imagem
      if (
        attachment.contentType &&
        attachment.contentType.startsWith("image/")
      ) {
        imageUrl = attachment.url;
        console.log(`Imagem detectada: ${imageUrl}`);
      }
    }

    // Adicionar a mensagem ao ticket
    ticket.messages.push({
      sender: "support",
      content:
        message.content || (imageUrl ? "Imagem enviada pelo suporte" : ""),
      imageUrl: imageUrl,
      timestamp: new Date().toISOString(),
      discordUserId: message.author.id,
      discordUsername: message.author.username,
    });
    saveActiveTickets();

    // Enviar a mensagem para o usuário no Telegram
    let success = false;

    if (imageUrl) {
      // Se tiver imagem, enviar a imagem
      success = await sendImageToTelegram(
        ticket.userId,
        imageUrl,
        message.content,
        ticketId,
      );
    } else {
      // Se for apenas texto, enviar o texto
      success = await sendToTelegramAPI(
        ticket.userId,
        message.content,
        ticketId,
        { isClosingMessage: false },
      );
    }

    // Reagir à mensagem para indicar sucesso ou falha
    if (success) {
      await message.react("✅");
    } else {
      await message.react("❌");
      await message.reply(
        "Failed to send message to Telegram user. They may have blocked the bot.",
      );
    }
  } catch (error) {
    console.error("Error handling Discord message:", error);
    try {
      await message.reply("An error occurred while processing your message.");
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
}

export { handleMessage };
