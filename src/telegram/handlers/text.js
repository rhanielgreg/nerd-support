import { activeTickets, userSessions } from "../../state.js";
import { saveActiveTickets } from "../../storage/tickets.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { escapeMarkdown } from "../../utils/markdown.js";
import { createTicket } from "../../services/tickets.js";
import { sendToDiscord } from "../../discord/messages.js";
import { Markup } from "telegraf";
import { getMainMenu } from "../menu.js";

async function handleText(ctx) {
  console.log(
    "Text message received:",
    ctx.message.text.substring(0, 30) + "...",
  );

  // Ignorar comandos
  if (ctx.message.text.startsWith("/")) {
    return;
  }

  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const session = userSessions[userId];

  // Verificar se o usuário tem um ticket ativo
  const activeTicket = activeTickets.find(
    (t) => t.userId === userId.toString() && t.status === "open",
  );

  // Se não há sessão ativa, mas há um ticket ativo, configurar a sessão para responder a esse ticket
  if (!session && activeTicket) {
    userSessions[userId] = { state: "replying", ticketId: activeTicket.id };
    console.log(
      `Configurando sessão para responder ao ticket ativo ${activeTicket.id}`,
    );
  }

  // Obter a sessão atualizada
  const updatedSession = userSessions[userId];

  // Se ainda não há sessão ativa, mostrar ajuda
  if (!updatedSession) {
    return ctx.reply(getTranslation("useNewTicket", lang), getMainMenu(lang));
  }

  // Processamento baseado no estado da sessão
  switch (updatedSession.state) {
    case "awaiting_subject":
      // Usuário está informando o assunto do ticket
      const subject = ctx.message.text.trim();

      if (subject.length < 3 || subject.length > 100) {
        return ctx.reply(getTranslation("subjectTooShort", lang));
      }

      // Atualizar estado da sessão
      userSessions[userId] = { state: "awaiting_description", subject };

      await ctx.reply(getTranslation("enterDescription", lang));
      break;

    case "awaiting_description":
      // Usuário está informando a descrição do ticket
      const description = ctx.message.text.trim();

      if (description.length < 10) {
        return ctx.reply(getTranslation("descriptionTooShort", lang));
      }

      try {
        // Criar o ticket
        const result = createTicket(
          userId,
          ctx.from.username,
          ctx.from.first_name,
          updatedSession.subject,
          description,
        );

        // Verificar se houve erro na criação do ticket
        if (result.error === "already_has_ticket") {
          // Informar ao usuário que ele já tem um ticket ativo
          const existingTicket = result.ticket;
          const ticketInfo = `*Ticket #${escapeMarkdown(existingTicket.id)}: ${escapeMarkdown(existingTicket.subject)}*`;
          const message = `You already have an active ticket:\n\n${ticketInfo}\n\nPlease continue the conversation in this ticket or close it before creating a new one.`;

          try {
            await ctx.reply(message, {
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
              `You already have an active ticket (#${existingTicket.id}). Please close it before creating a new one.`,
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
        await sendToDiscord(ticket, description, true);
      } catch (error) {
        console.error("Error creating ticket:", error);
        await ctx.reply(getTranslation("errorCreatingTicket", lang));
      }
      break;

    case "replying":
      // Usuário está respondendo a um ticket ativo
      const message = ctx.message.text.trim();
      const ticketId = updatedSession.ticketId;

      const ticket = activeTickets.find((t) => t.id === ticketId);
      if (!ticket) {
        delete userSessions[userId];
        return ctx.reply(getTranslation("ticketNotFound", lang));
      }

      // Adicionar mensagem ao ticket
      ticket.messages.push({
        sender: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });
      saveActiveTickets();

      // Confirmar envio
      await ctx.reply(getTranslation("messageSent", lang));

      // Enviar para o Discord
      await sendToDiscord(ticket, message, false);
      break;

    default:
      // Estado desconhecido, limpar sessão
      delete userSessions[userId];
      await ctx.reply(getTranslation("useNewTicket", lang), getMainMenu(lang));
  }
}

export { handleText };
