import { activeTickets, userSessions } from "../../state.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { escapeMarkdown } from "../../utils/markdown.js";
import { Markup } from "telegraf";

async function handleNewTicket(ctx) {
  console.log("New ticket command received");
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  // Verificar se o usuário já tem um ticket ativo
  const existingTicket = activeTickets.find(
    (t) => t.userId === userId.toString() && t.status === "open",
  );
  if (existingTicket) {
    // Informar ao usuário que ele já tem um ticket ativo
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
      await ctx.reply(message.replace(/\*/g, "") + ` (#${existingTicket.id})`);
    }

    // Definir o ticket ativo para o usuário
    userSessions[userId] = { state: "replying", ticketId: existingTicket.id };

    return;
  }

  // Iniciar processo de criação de ticket
  userSessions[userId] = { state: "awaiting_subject" };

  await ctx.reply(getTranslation("newTicketPrompt", lang));
}

export { handleNewTicket };
