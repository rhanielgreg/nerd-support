const translations = {
  en: {
    newTicketButton: "🎫 Open ticket",
    myTicketsButton: "📋 My ticket",
    helpButton: "❓ Help",
    languageButton: "🌐 Language",
    welcome:
      "👋 Hello, %s!\n\nWelcome to the support bot. Choose an option below to get started.",
    help: "📚 *Available commands:*\n\n• /start - Start the bot\n• /newticket - Create a new support ticket\n• /mytickets - View your active ticket\n• /help - Show this help message\n• /language - Change your preferred language",
    newTicketPrompt:
      "📝 Let's create a new support ticket.\n\nPlease enter the subject of your ticket:",
    noTickets: "You don't have any open tickets at the moment.",
    yourTickets: "🎫 *Your active ticket:*\n\n",
    ticketCreated:
      "✅ Your ticket has been created successfully!\n\n*Ticket #%s*\n*Subject:* %s\n\nA member of our support team will respond shortly. You will receive a notification here when there is a response.\n\nYou can simply reply to this chat to add more information to your ticket.",
    messageSent: "✅ Your message has been sent successfully!",
    ticketNotFound: "❌ Ticket not found or already closed.",
    ticketClosed: '✅ Ticket #%s "%s" has been closed successfully.',
    ticketClosedBySupport:
      '🔒 *Ticket #%s Closed*\n\nYour ticket "%s" has been closed by the support team.',
    subjectTooShort:
      "⚠️ The subject must be between 3 and 100 characters. Please try again:",
    descriptionTooShort:
      "⚠️ The description is too short. Please provide more details:",
    tooManyTickets:
      "⚠️ You already have an open ticket. Please wait for it to be resolved before opening a new one.",
    enterDescription: "👍 Great! Now, please describe your problem in detail:",
    replyToMessage:
      "✏️ *Reply to this message to add a response to the ticket.*",
    supportReply:
      "💬 *Support Response (Ticket #%s):*\n\n%s\n\n_You can reply directly to this chat to respond to the ticket._",
    useNewTicket:
      "👋 How can we help?\n\nUse the buttons below to open a ticket, view your current ticket or get help.",
    errorCreatingTicket:
      "❌ An error occurred while creating the ticket. Please try again later.",
    selectLanguage: "🌐 *Select your preferred language:*",
    languageChanged: "✅ Your language has been changed to English.",
    closeTicketButton: "Close Ticket",
    replyTicketButton: "Reply",
    confirmCloseTicket:
      "Are you sure you want to close this ticket? This action cannot be undone.",
    alreadyHasTicket:
      "You already have an active ticket. Please continue the conversation in that ticket or close it before creating a new one.",
  },
  pt: {
    newTicketButton: "🎫 Abrir ticket",
    myTicketsButton: "📋 Meu ticket",
    helpButton: "❓ Ajuda",
    languageButton: "🌐 Idioma",
    welcome:
      "👋 Olá, %s!\n\nBem-vindo ao bot de suporte. Escolha uma opção abaixo para começar.",
    help: "📚 *Comandos disponíveis:*\n\n• /start - Inicia o bot\n• /novoticket - Cria um novo ticket de suporte\n• /meustickets - Visualiza seu ticket ativo\n• /ajuda - Mostra esta mensagem de ajuda\n• /idioma - Altera seu idioma preferido",
    newTicketPrompt:
      "📝 Vamos criar um novo ticket de suporte.\n\nPor favor, digite o assunto do seu ticket:",
    noTickets: "Você não possui tickets abertos no momento.",
    yourTickets: "🎫 *Seu ticket ativo:*\n\n",
    ticketCreated:
      "✅ Seu ticket foi criado com sucesso!\n\n*Ticket #%s*\n*Assunto:* %s\n\nUm membro da nossa equipe de suporte irá responder em breve. Você receberá uma notificação aqui quando houver uma resposta.\n\nVocê pode simplesmente responder a este chat para adicionar mais informações ao seu ticket.",
    messageSent: "✅ Sua mensagem foi enviada com sucesso!",
    ticketNotFound: "❌ Ticket não encontrado ou já foi fechado.",
    ticketClosed: '✅ Ticket #%s "%s" foi fechado com sucesso.',
    ticketClosedBySupport:
      '🔒 *Ticket #%s Fechado*\n\nSeu ticket "%s" foi fechado pela equipe de suporte.',
    subjectTooShort:
      "⚠️ O assunto deve ter entre 3 e 100 caracteres. Por favor, tente novamente:",
    descriptionTooShort:
      "⚠️ A descrição é muito curta. Por favor, forneça mais detalhes:",
    tooManyTickets:
      "⚠️ Você já possui um ticket aberto. Por favor, aguarde a resolução dele antes de abrir um novo.",
    enterDescription:
      "👍 Ótimo! Agora, por favor, descreva seu problema em detalhes:",
    replyToMessage:
      "✏️ *Responda a esta mensagem para adicionar uma resposta ao ticket.*",
    supportReply:
      "💬 *Resposta do Suporte (Ticket #%s):*\n\n%s\n\n_Você pode responder diretamente a este chat para responder ao ticket._",
    useNewTicket:
      "👋 Como podemos ajudar?\n\nUse os botões abaixo para abrir um ticket, acompanhar seu atendimento ou acessar a ajuda.",
    errorCreatingTicket:
      "❌ Ocorreu um erro ao criar o ticket. Por favor, tente novamente mais tarde.",
    selectLanguage: "🌐 *Selecione seu idioma preferido:*",
    languageChanged: "✅ Seu idioma foi alterado para Português.",
    closeTicketButton: "Fechar Ticket",
    replyTicketButton: "Responder",
    confirmCloseTicket:
      "Tem certeza que deseja fechar este ticket? Esta ação não pode ser desfeita.",
    alreadyHasTicket:
      "Você já possui um ticket ativo. Por favor, continue a conversa nesse ticket ou feche-o antes de criar um novo.",
  },
  es: {
    newTicketButton: "🎫 Abrir ticket",
    myTicketsButton: "📋 Mi ticket",
    helpButton: "❓ Ayuda",
    languageButton: "🌐 Idioma",
    welcome:
      "👋 ¡Hola, %s!\n\nBienvenido al bot de soporte. Elige una opción abajo para comenzar.",
    help: "📚 *Comandos disponibles:*\n\n• /start - Inicia el bot\n• /nuevoticket - Crea un nuevo ticket de soporte\n• /mistickets - Ver tu ticket activo\n• /ayuda - Muestra este mensaje de ayuda\n• /idioma - Cambia tu idioma preferido",
    newTicketPrompt:
      "📝 Vamos a crear un nuevo ticket de soporte.\n\nPor favor, ingresa el asunto de tu ticket:",
    noTickets: "No tienes tickets abiertos en este momento.",
    yourTickets: "🎫 *Tu ticket activo:*\n\n",
    ticketCreated:
      "✅ ¡Tu ticket ha sido creado con éxito!\n\n*Ticket #%s*\n*Asunto:* %s\n\nUn miembro de nuestro equipo de soporte responderá en breve. Recibirás una notificación aquí cuando haya una respuesta.\n\nPuedes simplemente responder a este chat para añadir más información a tu ticket.",
    messageSent: "✅ ¡Tu mensaje ha sido enviado con éxito!",
    ticketNotFound: "❌ Ticket no encontrado o ya cerrado.",
    ticketClosed: '✅ Ticket #%s "%s" ha sido cerrado con éxito.',
    ticketClosedBySupport:
      '🔒 *Ticket #%s Cerrado*\n\nTu ticket "%s" ha sido cerrado por el equipo de soporte.',
    subjectTooShort:
      "⚠️ El asunto debe tener entre 3 y 100 caracteres. Por favor, inténtalo de nuevo:",
    descriptionTooShort:
      "⚠️ La descripción es demasiado corta. Por favor, proporciona más detalles:",
    tooManyTickets:
      "⚠️ Ya tienes un ticket abierto. Por favor, espera a que sea resuelto antes de abrir uno nuevo.",
    enterDescription:
      "👍 ¡Genial! Ahora, por favor, describe tu problema en detalle:",
    replyToMessage:
      "✏️ *Responde a este mensaje para añadir una respuesta al ticket.*",
    supportReply:
      "💬 *Respuesta del Soporte (Ticket #%s):*\n\n%s\n\n_Puedes responder directamente a este chat para responder al ticket._",
    useNewTicket:
      "👋 ¿Cómo podemos ayudarte?\n\nUsa los botones de abajo para abrir un ticket, consultar tu atención o ver la ayuda.",
    errorCreatingTicket:
      "❌ Ocurrió un error al crear el ticket. Por favor, inténtalo de nuevo más tarde.",
    selectLanguage: "🌐 *Selecciona tu idioma preferido:*",
    languageChanged: "✅ Tu idioma ha sido cambiado a Español.",
    closeTicketButton: "Cerrar Ticket",
    replyTicketButton: "Responder",
    confirmCloseTicket:
      "¿Estás seguro de que quieres cerrar este ticket? Esta acción no se puede deshacer.",
    alreadyHasTicket:
      "Ya tienes un ticket activo. Por favor, continúa la conversación en ese ticket o ciérralo antes de crear uno nuevo.",
  },
};

export { translations };
