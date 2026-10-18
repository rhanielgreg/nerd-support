import { TELEGRAM_TOKEN } from "../../config.js";
import { activeTickets, userSessions } from "../../state.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { escapeMarkdown } from "../../utils/markdown.js";
import { createTicket } from "../../services/tickets.js";
import { sendImageToDiscord } from "../../discord/messages.js";
import { processPhotoReply } from "../photos.js";
import { Markup } from "telegraf";
import { getMainMenu } from "../menu.js";

async function handlePhoto(ctx) {
  console.log("Photo message received");

  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const session = userSessions[userId];

  // Se não há sessão ativa, verificar se o usuário tem um ticket ativo
  if (!session) {
    const activeTicket = activeTickets.find(
      (t) => t.userId === userId.toString() && t.status === "open",
    );

    if (activeTicket) {
      // Configurar sessão para responder ao ticket ativo
      userSessions[userId] = { state: "replying", ticketId: activeTicket.id };

      // Processar a foto como uma resposta ao ticket
      return processPhotoReply(ctx, activeTicket);
    } else {
      // Sem sessão e sem ticket ativo
      return ctx.reply(getTranslation("useNewTicket", lang), getMainMenu(lang));
    }
  }

  // Processar com base no estado da sessão
  switch (session.state) {
    case "awaiting_description":
      // Usuário está enviando uma foto como descrição do ticket
      try {
        // Obter o array de fotos (diferentes tamanhos)
        const photoSizes = ctx.message.photo;

        // Pegar a foto com maior resolução (último item do array)
        const photo = photoSizes[photoSizes.length - 1];

        // Obter o arquivo da foto
        const fileId = photo.file_id;
        const fileInfo = await ctx.telegram.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileInfo.file_path}`;

        console.log("Foto recebida como descrição");

        // Obter legenda da foto, se houver
        const caption = ctx.message.caption || "Imagem enviada como descrição";

        // Criar o ticket com a imagem
        const result = createTicket(
          userId,
          ctx.from.username,
          ctx.from.first_name,
          session.subject,
          caption,
          fileInfo.file_path,
        );

        // Verificar se houve erro na criação do ticket
        if (result.error === "already_has_ticket") {
          // Informar ao usuário que ele já tem um ticket ativo
          const existingTicket = result.ticket;
          const ticketInfo = `*Ticket #${escapeMarkdown(existingTicket.id)}: ${escapeMarkdown(existingTicket.subject)}*`;
          const message = getTranslation("alreadyHasTicket", lang);

          try {
            await ctx.reply(`${message}\n\n${ticketInfo}`, {
              parse_mode: "MarkdownV2",
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback(
                    getTranslation("closeTicketButton", lang),
                    `direct_close_${existingTicket.id}`,
                  ),
                ],
              ]),
            });
          } catch (error) {
            console.error("Error sending ticket info:", error);
            await ctx.reply(
              message.replace(/\*/g, "") + ` (#${existingTicket.id})`,
            );
          }

          // Definir o ticket ativo para o usuário
          userSessions[userId] = {
            state: "replying",
            ticketId: existingTicket.id,
          };

          return;
        }

        const ticket = result.ticket;

        // Configurar sessão para responder ao novo ticket
        userSessions[userId] = { state: "replying", ticketId: ticket.id };

        // Confirmar criação
        try {
          const ticketCreatedMessage = getTranslation(
            "ticketCreated",
            lang,
            escapeMarkdown(ticket.id),
            escapeMarkdown(ticket.subject),
          );

          // Adicionar botão para fechar o ticket
          const closeButtonText = getTranslation("closeTicketButton", lang);

          await ctx.reply(ticketCreatedMessage, {
            parse_mode: "MarkdownV2",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  closeButtonText,
                  `direct_close_${ticket.id}`,
                ),
              ],
            ]),
          });
        } catch (markdownError) {
          console.error(
            "Error sending ticket created message with MarkdownV2:",
            markdownError,
          );
          // Tentar sem formatação
          await ctx.reply(
            `Ticket #${ticket.id} "${ticket.subject}" has been created!\n\nYou can reply directly to this chat to respond to the ticket.`,
            {
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback(
                    getTranslation("closeTicketButton", lang),
                    `direct_close_${ticket.id}`,
                  ),
                ],
              ]),
            },
          );
        }

        // Enviar para o Discord
        await sendImageToDiscord(ticket, fileUrl, caption, true);
      } catch (error) {
        console.error("Error creating ticket with image:", error);
        await ctx.reply(getTranslation("errorCreatingTicket", lang));
      }
      break;

    case "replying":
      // Usuário está respondendo a um ticket ativo com uma foto
      const ticketId = session.ticketId;
      const ticket = activeTickets.find((t) => t.id === ticketId);

      if (!ticket) {
        delete userSessions[userId];
        return ctx.reply(getTranslation("ticketNotFound", lang));
      }

      return processPhotoReply(ctx, ticket);

    default:
      // Estado desconhecido, limpar sessão
      delete userSessions[userId];
      await ctx.reply(getTranslation("useNewTicket", lang), getMainMenu(lang));
  }
}

export { handlePhoto };
