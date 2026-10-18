import { activeTickets } from "../state.js";
import { getTicketById, addMessage } from "../services/tickets.js";
import { sendToTelegramAPI } from "../telegram/api.js";

async function handleDiscordReply(ticketId, content, authorName) {
  console.log(
    `Resposta do Discord para o ticket ${ticketId}: "${content.substring(0, 30)}..."`,
  );

  // Encontrar o ticket
  const ticket = getTicketById(ticketId);
  if (!ticket) {
    console.error(`Ticket ${ticketId} não encontrado`);

    // Tentar encontrar o ticket por ID parcial
    if (ticketId.includes("_")) {
      const [prefix, number] = ticketId.split("_");
      console.log(
        `Tentando encontrar ticket com prefixo ${prefix} e número ${number}`,
      );
    } else {
      console.log(`Tentando encontrar ticket que comece com ${ticketId}_`);
      const matchingTicket = activeTickets.find((t) =>
        t.id.startsWith(ticketId + "_"),
      );
      if (matchingTicket) {
        console.log(`Ticket encontrado com ID completo: ${matchingTicket.id}`);
        return handleDiscordReply(matchingTicket.id, content, authorName);
      }
    }

    return false;
  }

  // Verificar se o ticket está fechado
  if (ticket.status === "closed") {
    console.error(`Ticket ${ticketId} está fechado`);
    return false;
  }

  try {
    // Adicionar mensagem ao ticket
    addMessage(ticketId, "support", content);
    console.log(`Mensagem adicionada ao ticket ${ticketId}`);

    // Enviar mensagem para o usuário no Telegram usando API direta
    const result = await sendToTelegramAPI(ticket.userId, content, ticketId, {
      isClosingMessage: true,
    });
    console.log(
      `Resultado do envio para o Telegram: ${result ? "Sucesso" : "Falha"}`,
    );

    return result;
  } catch (error) {
    console.error(
      `Erro ao processar resposta do Discord para o ticket ${ticketId}:`,
      error,
    );
    return false;
  }
}

export { handleDiscordReply };
