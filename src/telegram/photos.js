import { TELEGRAM_TOKEN } from "../config.js";
import { saveActiveTickets } from "../storage/tickets.js";
import { getUserLanguage, getTranslation } from "../i18n/index.js";
import { sendImageToDiscord } from "../discord/messages.js";

async function processPhotoReply(ctx, ticket) {
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  try {
    // Obter o array de fotos (diferentes tamanhos)
    const photoSizes = ctx.message.photo;

    // Pegar a foto com maior resolução (último item do array)
    const photo = photoSizes[photoSizes.length - 1];

    // Obter o arquivo da foto
    const fileId = photo.file_id;
    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileInfo.file_path}`;

    console.log("Foto recebida como resposta");

    // Obter legenda da foto, se houver
    const caption = ctx.message.caption || "Imagem enviada pelo usuário";

    // Adicionar mensagem ao ticket
    ticket.messages.push({
      sender: "user",
      content: caption,
      imageUrl: fileInfo.file_path,
      timestamp: new Date().toISOString(),
    });
    saveActiveTickets();

    // Confirmar envio
    await ctx.reply(getTranslation("messageSent", lang));

    // Enviar para o Discord
    await sendImageToDiscord(ticket, fileUrl, caption, false);

    return true;
  } catch (error) {
    console.error("Error processing photo reply:", error);
    await ctx.reply("Erro ao processar a imagem. Por favor, tente novamente.");
    return false;
  }
}

export { processPhotoReply };
