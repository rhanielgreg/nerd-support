// Referências compartilhadas entre os serviços e os manipuladores.
// Os arrays e objetos são atualizados no lugar para manter essas referências.
const activeTickets = [];
const userSessions = {};
const ticketCounters = {};
const userLanguages = {};

export { activeTickets, userSessions, ticketCounters, userLanguages };
