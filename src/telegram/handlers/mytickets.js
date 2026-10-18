import { activeTickets, userSessions } from "../../state.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { Markup } from "telegraf";
import { getMainMenu } from "../menu.js";

async function handleMyTickets(ctx) {
  console.log("My tickets command received");
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  // Encontrar o ticket ativo do usuário
  const userTicket = activeTickets.find(
    (t) => t.userId === userId.toString() && t.status === "open",
  );

  if (!userTicket) {
    return ctx.reply(getTranslation("noTickets", lang), getMainMenu(lang));
  }

  let message = getTranslation("yourTickets", lang);

  message += `*Ticket #${userTicket.id}: ${userTicket.subject}*\n`;
  message += `${new Date(userTicket.createdAt).toLocaleString()}\n\n`;
  message += getTranslation("replyToMessage", lang);

  // Criar botão para fechar o ticket
  const buttons = [
    [
      Markup.button.callback(
        getTranslation("closeTicketButton", lang),
        `direct_close_${userTicket.id}`,
      ),
    ],
  ];

  try {
    // Escapar caracteres especiais do Markdown
    let escapedMessage = message
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/~/g, "\\~")
      .replace(/`/g, "\\`")
      .replace(/>/g, "\\>")
      .replace(/#/g, "\\#")
      .replace(/\+/g, "\\+")
      .replace(/-/g, "\\-")
      .replace(/=/g, "\\=")
      .replace(/\|/g, "\\|")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\./g, "\\.")
      .replace(/\!/g, "\\!");

    // Definir o estado da sessão para responder ao ticket
    userSessions[userId] = { state: "replying", ticketId: userTicket.id };

    await ctx.reply(escapedMessage, {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (error) {
    console.error("Error sending ticket info with MarkdownV2:", error);
    // Tentar sem formatação
    let plainMessage = message.replace(/\*/g, "");
    await ctx.reply(plainMessage, {
      ...Markup.inlineKeyboard(buttons),
    });
  }
}

export { handleMyTickets };
