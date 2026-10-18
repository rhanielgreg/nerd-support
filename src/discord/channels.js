import {
  DISCORD_CATEGORY_ID,
  DISCORD_ARCHIVE_CATEGORY_ID,
  DISCORD_MOD_ROLE_ID,
} from "../config.js";
import { activeTickets } from "../state.js";
import { discordClient, discordGuild } from "../clients.js";
import { saveActiveTickets } from "../storage/tickets.js";
import { getTicketById } from "../services/tickets.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

async function syncWithDiscord() {
  if (!discordGuild) return;

  console.log("Syncing with Discord channels...");

  try {
    // Verificar canais de ticket existentes
    const channels = await discordGuild.channels.fetch();
    const ticketChannels = channels.filter(
      (channel) =>
        channel.type === 0 && // GUILD_TEXT
        channel.name.startsWith("ticket-") &&
        !channel.name.startsWith("closed-"),
    );

    console.log(
      `Found ${ticketChannels.size} active ticket channels in Discord`,
    );

    // Para cada canal de ticket, verificar se já temos o ticket em memória
    for (const [id, channel] of ticketChannels) {
      try {
        console.log(`Processando canal: ${channel.name} (${channel.id})`);

        const topic = channel.topic;
        if (!topic) {
          console.log(`Canal ${channel.name} sem tópico, ignorando`);
          continue;
        }

        console.log(`Tópico do canal: ${topic}`);

        const ticketIdMatch = topic.match(/Ticket #([a-zA-Z0-9_]+)/);
        const userIdMatch = topic.match(/Telegram ID: (\d+)/);

        if (!ticketIdMatch || !userIdMatch) {
          console.log(
            `Canal ${channel.name} sem ID de ticket ou ID de usuário no tópico, ignorando`,
          );
          continue;
        }

        const ticketId = ticketIdMatch[1];
        const userId = userIdMatch[1];

        console.log(
          `ID do ticket extraído: ${ticketId}, ID do usuário: ${userId}`,
        );

        // Verificar se já temos este ticket
        const existingTicket = getTicketById(ticketId);
        if (existingTicket) {
          console.log(
            `Ticket ${ticketId} já existe, atualizando ID do canal se necessário`,
          );

          // Verificar se o ticket foi criado recentemente (nos últimos 30 segundos)
          const isRecentlyCreated =
            existingTicket.createdAt &&
            new Date().getTime() -
              new Date(existingTicket.createdAt).getTime() <
              30000;

          // Atualizar o ID do canal apenas se não for um ticket recém-criado ou se não tiver ID de canal
          if (!isRecentlyCreated && existingTicket.discordChannelId !== id) {
            console.log(
              `Atualizando ID do canal de ${existingTicket.discordChannelId || "Nenhum"} para ${id}`,
            );
            existingTicket.discordChannelId = id;
            saveActiveTickets();
          } else if (isRecentlyCreated) {
            console.log(
              `Ticket ${ticketId} foi criado recentemente, mantendo o ID do canal original: ${existingTicket.discordChannelId}`,
            );
          }
          continue;
        }

        // Extrair o assunto do nome do canal
        const subjectMatch = channel.name.match(/ticket-[a-zA-Z0-9]+-(.+)/);
        const subject = subjectMatch
          ? subjectMatch[1].replace(/-/g, " ")
          : "Unknown Subject";

        // Criar um novo ticket baseado no canal
        const newTicket = {
          id: ticketId,
          userId: userId,
          username: "User from Discord",
          firstName: "User",
          subject: subject,
          status: "open",
          createdAt: channel.createdAt.toISOString(),
          discordChannelId: id,
          messages: [
            {
              sender: "system",
              content: "This ticket was synchronized from Discord.",
              timestamp: new Date().toISOString(),
            },
          ],
        };

        activeTickets.push(newTicket);
      } catch (error) {
        console.error(`Error processing channel ${id}:`, error);
      }
    }

    saveActiveTickets();
    console.log("Discord synchronization complete");
  } catch (error) {
    console.error("Error syncing with Discord:", error);
  }
}

async function createTicketChannel(ticket) {
  if (!discordGuild) {
    console.error("Servidor Discord não configurado");
    return null;
  }

  try {
    console.log(`Criando canal para o ticket #${ticket.id}`);

    // Buscar o cargo @everyone
    const everyoneRole = discordGuild.roles.everyone;

    // Buscar o bot
    const botUser = discordClient.user;

    // Verificar se o bot e o cargo @everyone existem
    if (!everyoneRole) {
      console.error("Cargo @everyone não encontrado");
      return null;
    }

    if (!botUser) {
      console.error("Bot não encontrado");
      return null;
    }

    // Definir permissões do canal
    const permissionOverwrites = [
      {
        id: everyoneRole.id,
        deny: ["ViewChannel", "SendMessages"],
      },
      {
        id: botUser.id,
        allow: [
          "ViewChannel",
          "SendMessages",
          "ManageChannels",
          "ManageMessages",
        ],
      },
    ];

    // Adicionar permissão para o cargo de moderador, se configurado
    if (DISCORD_MOD_ROLE_ID) {
      try {
        // Verificar se o cargo existe antes de adicionar
        const modRole = await discordGuild.roles.fetch(DISCORD_MOD_ROLE_ID);
        if (modRole) {
          permissionOverwrites.push({
            id: modRole.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          });
        } else {
          console.warn(
            `Cargo de moderador ${DISCORD_MOD_ROLE_ID} não encontrado`,
          );
        }
      } catch (error) {
        console.error(
          `Erro ao buscar cargo de moderador ${DISCORD_MOD_ROLE_ID}:`,
          error,
        );
      }
    }

    // Criar o canal
    const channelName = `ticket-${ticket.id}-${ticket.username.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

    // Verificar se a categoria existe
    let parent = null;
    if (DISCORD_CATEGORY_ID) {
      try {
        console.log(
          `[DEBUG] Buscando categoria para tickets ativos: ${DISCORD_CATEGORY_ID}`,
        );
        parent = await discordGuild.channels.fetch(DISCORD_CATEGORY_ID);
        console.log(
          `[DEBUG] Categoria encontrada: ${parent ? parent.name : "Não encontrada"}`,
        );

        // Verificar se não está usando a categoria de arquivamento por engano
        if (
          parent &&
          DISCORD_ARCHIVE_CATEGORY_ID &&
          parent.id === DISCORD_ARCHIVE_CATEGORY_ID
        ) {
          console.error(
            `[DEBUG] ERRO: A categoria configurada é a de arquivamento! Categoria ativa: ${parent.id}, Categoria de arquivamento: ${DISCORD_ARCHIVE_CATEGORY_ID}`,
          );
          console.error(
            `[DEBUG] Definindo parent como null para evitar criar tickets na categoria errada`,
          );
          parent = null;
        }
      } catch (error) {
        console.error(
          `Erro ao buscar categoria ${DISCORD_CATEGORY_ID}:`,
          error,
        );
        parent = null;
      }
    }

    // Se não encontrou a categoria, tentar buscar todas as categorias e encontrar a correta
    if (!parent && DISCORD_CATEGORY_ID) {
      try {
        console.log(`[DEBUG] Tentando buscar todas as categorias do servidor`);
        const categories = await discordGuild.channels.fetch();
        console.log(`[DEBUG] Categorias encontradas: ${categories.size}`);

        // Filtrar apenas canais do tipo categoria (type 4)
        const categoryChannels = categories.filter(
          (channel) => channel.type === 4,
        );
        console.log(`[DEBUG] Categorias filtradas: ${categoryChannels.size}`);

        // Listar todas as categorias para depuração
        categoryChannels.forEach((category) => {
          console.log(`[DEBUG] Categoria: ${category.name} (${category.id})`);
        });

        // Tentar encontrar a categoria pelo ID
        parent = categoryChannels.find(
          (category) => category.id === DISCORD_CATEGORY_ID,
        );
        console.log(
          `[DEBUG] Categoria encontrada pelo ID: ${parent ? parent.name : "Não encontrada"}`,
        );

        // Verificar se não é a categoria de arquivamento
        if (
          parent &&
          DISCORD_ARCHIVE_CATEGORY_ID &&
          parent.id === DISCORD_ARCHIVE_CATEGORY_ID
        ) {
          console.error(
            `[DEBUG] ERRO: A categoria encontrada é a de arquivamento! Definindo parent como null`,
          );
          parent = null;
        }
      } catch (error) {
        console.error(`Erro ao buscar categorias do servidor:`, error);
        parent = null;
      }
    }

    console.log(
      `[DEBUG] Criando canal com parent: ${parent ? parent.id : "null"}`,
    );
    const channel = await discordGuild.channels.create({
      name: channelName,
      type: 0, // GUILD_TEXT
      parent: parent ? parent.id : null,
      permissionOverwrites: permissionOverwrites,
      topic: `Ticket #${ticket.id} | User: ${ticket.username} | Telegram ID: ${ticket.userId}`,
    });

    console.log(`Canal criado: ${channel.name} (${channel.id})`);
    console.log(`Tópico do canal: ${channel.topic}`);

    // Atualizar o ticket com o ID do canal
    ticket.discordChannelId = channel.id;
    console.log(
      `Ticket atualizado com ID do canal: ${ticket.discordChannelId}`,
    );
    saveActiveTickets();

    // Enviar mensagem inicial no canal
    const embed = new EmbedBuilder()
      .setTitle(`Ticket #${ticket.id}: ${ticket.subject}`)
      .setDescription(ticket.messages[0].content)
      .setColor(0x3498db)
      .addFields(
        { name: "Telegram ID", value: ticket.userId, inline: true },
        { name: "User", value: ticket.username, inline: true },
        {
          name: "Created at",
          value: new Date(ticket.createdAt).toLocaleString(),
          inline: true,
        },
      )
      .setFooter({ text: `Ticket ID: ${ticket.id}` })
      .setTimestamp();

    // Criar apenas o botão de fechar
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${ticket.id}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger),
    );

    // Enviar mensagem de instruções
    await channel.send({
      content:
        `**New Ticket #${ticket.id}**\n\n` +
        `📝 **Instructions:**\n` +
        `• All messages sent in this channel will be forwarded to the user on Telegram\n` +
        `• Use the "Close Ticket" button when the issue is resolved\n` +
        `• You can send messages normally in this channel`,
      embeds: [embed],
      components: [row],
    });

    // Não mover para a categoria de arquivamento aqui
    // Isso será feito apenas quando o ticket for fechado

    return channel;
  } catch (error) {
    console.error("Error creating channel for ticket:", error);
    return null;
  }
}

export { syncWithDiscord, createTicketChannel };
