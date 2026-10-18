import { activeTickets } from "../../state.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { Markup } from "telegraf";

async function handleDirectClose(ctx) {
  console.log("Direct close action received");
  const ticketId = ctx.match[1];
  console.log(
    `[DEBUG-TELEGRAM] ID do ticket extraído do botão direct_close_: ${ticketId}`,
  );

  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  // Encontrar o ticket do usuário atual
  console.log(`[DEBUG-TELEGRAM] Buscando tickets do usuário: ${userId}`);
  const userTickets = activeTickets.filter(
    (t) => t.userId === userId.toString() && t.status === "open",
  );
  console.log(
    `[DEBUG-TELEGRAM] Tickets encontrados para o usuário: ${userTickets.length}`,
  );

  if (userTickets.length === 0) {
    console.log(
      `[DEBUG-TELEGRAM] Nenhum ticket ativo encontrado para o usuário: ${userId}`,
    );
    return ctx.answerCbQuery(getTranslation("ticketNotFound", lang));
  }

  // Usar o primeiro ticket ativo do usuário
  const ticket = userTickets[0];
  console.log(`[DEBUG-TELEGRAM] Usando o ticket: ${JSON.stringify(ticket)}`);

  // Confirmar antes de fechar
  try {
    await ctx.answerCbQuery();

    // Perguntar se o usuário tem certeza
    console.log(
      `[DEBUG-TELEGRAM] Enviando mensagem de confirmação para fechar o ticket ${ticket.id}`,
    );
    await ctx.reply(
      getTranslation("confirmCloseTicket", lang),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ " + getTranslation("closeTicketButton", lang),
            `confirm_close_${ticket.id}`,
          ),
          Markup.button.callback("❌ " + "Cancel", `cancel_close_${ticket.id}`),
        ],
      ]),
    );
  } catch (error) {
    console.error("Error showing close confirmation:", error);
    await ctx.answerCbQuery("Error showing confirmation dialog");
  }
}

export { handleDirectClose };
