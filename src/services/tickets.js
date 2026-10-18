import { activeTickets, ticketCounters } from "../state.js";
import { saveActiveTickets } from "../storage/tickets.js";

function generateTicketId(userId) {
  console.log(`[DEBUG-ID] Gerando ID de ticket para usuário: ${userId}`);

  // Garantir que userId seja uma string
  const userIdStr = userId.toString();
  console.log(`[DEBUG-ID] UserID como string: ${userIdStr}`);

  // Inicializar contador se não existir
  if (!ticketCounters[userIdStr]) {
    console.log(`[DEBUG-ID] Inicializando contador para usuário ${userIdStr}`);
    ticketCounters[userIdStr] = 0;
  }

  // Incrementar contador
  ticketCounters[userIdStr]++;
  console.log(
    `[DEBUG-ID] Novo valor do contador: ${ticketCounters[userIdStr]}`,
  );

  // Gerar ID no formato userId_contador
  const ticketId = `${userIdStr}_${ticketCounters[userIdStr]}`;
  console.log(`[DEBUG-ID] ID de ticket gerado: ${ticketId}`);
  console.log(`[DEBUG-ID] Comprimento do ID: ${ticketId.length}`);
  console.log(
    `[DEBUG-ID] Caracteres do ID: ${Array.from(ticketId).join(", ")}`,
  );

  return ticketId;
}

// Modificar a função createTicket para suportar imagens
function createTicket(
  userId,
  username,
  firstName,
  subject,
  description,
  imageUrl = null,
) {
  console.log(`Criando ticket para usuário: ${userId}`);

  // Verificar se o usuário já tem um ticket ativo
  const existingTicket = activeTickets.find(
    (t) => t.userId === userId.toString() && t.status === "open",
  );
  if (existingTicket) {
    console.log(
      `Usuário ${userId} já tem um ticket ativo: ${existingTicket.id}`,
    );
    return { error: "already_has_ticket", ticket: existingTicket };
  }

  const ticketId = generateTicketId(userId);
  console.log(`ID do ticket gerado: ${ticketId}`);

  const newTicket = {
    id: ticketId,
    userId: userId.toString(),
    username: username || firstName || "Unknown",
    firstName: firstName || "User",
    subject,
    status: "open",
    createdAt: new Date().toISOString(),
    messages: [
      {
        sender: "user",
        content: description,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  console.log(`Novo ticket criado: ${JSON.stringify(newTicket, null, 2)}`);
  activeTickets.push(newTicket);
  saveActiveTickets();

  return { ticket: newTicket };
}

// Função para obter um ticket pelo ID
function getTicketById(ticketId) {
  console.log(`[DEBUG] Buscando ticket com ID: ${ticketId}`);
  console.log(`[DEBUG] Tickets ativos: ${activeTickets.length}`);

  // Listar todos os IDs de tickets ativos para depuração
  console.log("[DEBUG] IDs de tickets ativos:");
  activeTickets.forEach((t) =>
    console.log(`[DEBUG] - ${t.id} (status: ${t.status})`),
  );

  // Verificar se o ID do ticket contém caracteres especiais
  console.log(`[DEBUG] Verificando caracteres no ID do ticket: ${ticketId}`);
  console.log(`[DEBUG] Comprimento do ID: ${ticketId.length}`);
  console.log(`[DEBUG] Caracteres do ID: ${Array.from(ticketId).join(", ")}`);

  // Tentar encontrar o ticket com correspondência exata
  let ticket = activeTickets.find((t) => t.id === ticketId);
  console.log(
    `[DEBUG] Ticket encontrado com correspondência exata: ${ticket ? "Sim" : "Não"}`,
  );

  // Se não encontrar com correspondência exata, tentar encontrar com startsWith
  if (!ticket) {
    console.log(
      `[DEBUG] Tentando encontrar ticket que comece com: ${ticketId}`,
    );
    ticket = activeTickets.find((t) => t.id.startsWith(ticketId));
    if (ticket) {
      console.log(`[DEBUG] Ticket encontrado com startsWith: ${ticket.id}`);
    }
  }

  // Se ainda não encontrar, tentar extrair o ID do usuário e o contador
  if (!ticket && ticketId.includes("_")) {
    console.log(`[DEBUG] Tentando extrair partes do ID: ${ticketId}`);
    const parts = ticketId.split("_");
    if (parts.length >= 2) {
      const userId = parts[0];
      console.log(`[DEBUG] UserID extraído: ${userId}`);

      // Procurar tickets deste usuário
      const userTickets = activeTickets.filter(
        (t) => t.userId === userId && t.status === "open",
      );
      console.log(
        `[DEBUG] Tickets encontrados para o usuário ${userId}: ${userTickets.length}`,
      );

      if (userTickets.length > 0) {
        // Retornar o primeiro ticket ativo do usuário
        ticket = userTickets[0];
        console.log(
          `[DEBUG] Usando o primeiro ticket ativo do usuário: ${ticket.id}`,
        );
      }
    }
  }

  return ticket;
}

// Função para fechar um ticket
function closeTicket(ticketId) {
  console.log(`[DEBUG] Tentando fechar o ticket: ${ticketId}`);

  // Primeiro, tentar encontrar o ticket usando a função getTicketById
  const ticket = getTicketById(ticketId);

  if (ticket) {
    console.log(
      `[DEBUG] Ticket encontrado para fechamento: ${JSON.stringify(ticket)}`,
    );

    // Encontrar o índice do ticket na lista de ativos
    const index = activeTickets.findIndex((t) => t.id === ticket.id);
    console.log(`[DEBUG] Índice do ticket na lista de ativos: ${index}`);

    if (index !== -1) {
      // Remover o ticket da lista de ativos
      activeTickets.splice(index, 1);
      saveActiveTickets();
      console.log(`[DEBUG] Ticket removido da lista de ativos e lista salva`);
      return ticket;
    } else {
      console.log(
        `[DEBUG] Ticket encontrado mas não está na lista de ativos (índice: ${index})`,
      );
    }
  } else {
    console.log(`[DEBUG] Ticket não encontrado para fechamento: ${ticketId}`);

    // Tentar encontrar diretamente na lista de ativos
    const index = activeTickets.findIndex((t) => t.id === ticketId);
    console.log(`[DEBUG] Tentativa direta - Índice do ticket: ${index}`);

    if (index !== -1) {
      const ticket = activeTickets[index];
      console.log(
        `[DEBUG] Ticket encontrado diretamente: ${JSON.stringify(ticket)}`,
      );
      activeTickets.splice(index, 1);
      saveActiveTickets();
      console.log(`[DEBUG] Ticket removido da lista de ativos e lista salva`);
      return ticket;
    }
  }

  console.log(`[DEBUG] Não foi possível fechar o ticket: ${ticketId}`);
  return null;
}

function addMessage(ticketId, sender, content, imageUrl = null) {
  const ticket = activeTickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  ticket.messages.push({
    sender,
    content,
    imageUrl,
    timestamp: new Date().toISOString(),
  });

  saveActiveTickets();
  return ticket;
}

export {
  generateTicketId,
  createTicket,
  getTicketById,
  closeTicket,
  addMessage,
};
