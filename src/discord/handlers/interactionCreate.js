import {
  DISCORD_ARCHIVE_CATEGORY_ID,
  DISCORD_MOD_ROLE_ID,
} from "../../config.js";
import { activeTickets } from "../../state.js";
import { discordGuild } from "../../clients.js";
import { saveActiveTickets } from "../../storage/tickets.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { sendToTelegramAPI } from "../../telegram/api.js";
import { EmbedBuilder } from "discord.js";

async function handleInteraction(interaction) {
  try {
    // Manipular apenas cliques no botão de fechar
    if (interaction.isButton() && interaction.customId.startsWith("close_")) {
      // Extrair o ID completo do ticket (tudo após "close_")
      const ticketId = interaction.customId.substring(6); // "close_".length = 6
      console.log(
        `[DEBUG-DISCORD] Botão de fechar clicado para o ticket: ${ticketId}`,
      );

      // Verificar se o ticket existe usando o tópico do canal
      const channelTopic = interaction.channel.topic;
      console.log(`[DEBUG-DISCORD] Tópico do canal: ${channelTopic}`);

      // Extrair o ID do ticket do tópico do canal
      let ticket = null;
      if (channelTopic) {
        const match = channelTopic.match(/Ticket #([^|]+)/);
        if (match && match[1]) {
          const ticketIdFromTopic = match[1].trim();
          console.log(
            `[DEBUG-DISCORD] ID do ticket extraído do tópico: ${ticketIdFromTopic}`,
          );

          // Buscar o ticket pelo ID extraído do tópico
          ticket = activeTickets.find((t) => t.id === ticketIdFromTopic);
        }
      }

      // Se não encontrou pelo tópico, tentar pelo ID do botão
      if (!ticket) {
        ticket = activeTickets.find((t) => t.id === ticketId);
      }

      console.log(
        `[DEBUG-DISCORD] Resultado da busca: ${ticket ? JSON.stringify(ticket) : "Não encontrado"}`,
      );

      if (!ticket) {
        console.log(`[DEBUG-DISCORD] Ticket não encontrado ou já fechado`);
        return interaction.reply({
          content: "Ticket not found or already closed.",
          ephemeral: true,
        });
      }

      console.log(
        `[DEBUG-DISCORD] Fechando ticket: ${ticket.id}, Status atual: ${ticket.status}`,
      );

      // Fechar o ticket (remover da lista de ativos)
      const index = activeTickets.findIndex((t) => t.id === ticket.id);

      if (index === -1) {
        console.log(
          `[DEBUG-DISCORD] Ticket não encontrado na lista de ativos: ${ticket.id}`,
        );
        return interaction.reply({
          content: "Ticket not found or already closed.",
          ephemeral: true,
        });
      }

      // Remover o ticket da lista de ativos
      activeTickets.splice(index, 1);
      saveActiveTickets();
      console.log(
        `[DEBUG-DISCORD] Ticket removido da lista de ativos: ${ticket.id}`,
      );

      // Notificar o usuário no Telegram
      try {
        const lang = getUserLanguage(ticket.userId);
        console.log(
          `[DEBUG-DISCORD] Notificando usuário ${ticket.userId} sobre o fechamento do ticket ${ticket.id}`,
        );
        await sendToTelegramAPI(
          ticket.userId,
          getTranslation(
            "ticketClosedBySupport",
            lang,
            ticket.id,
            ticket.subject,
          ),
          ticket.id,
          { isClosingMessage: true },
        );
      } catch (error) {
        console.error("Error notifying user about ticket closure:", error);
      }

      // Responder à interação
      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticket.id} Closed`)
        .setDescription(
          `The ticket "${ticket.subject}" was closed by the user.`,
        )
        .setColor(0xff0000)
        .setFooter({ text: `Ticket ID: ${ticket.id}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Arquivar o canal
      try {
        const channel = interaction.channel;

        // Renomear o canal
        await channel.setName(`closed-${ticket.id.replace(/_/g, "")}`);

        // Mover para a categoria de arquivamento
        if (DISCORD_ARCHIVE_CATEGORY_ID) {
          try {
            console.log(
              `[DEBUG-TELEGRAM] Buscando categoria de arquivamento: ${DISCORD_ARCHIVE_CATEGORY_ID}`,
            );
            const archiveCategory = await discordGuild.channels.fetch(
              DISCORD_ARCHIVE_CATEGORY_ID,
            );
            if (archiveCategory) {
              console.log(
                `[DEBUG-TELEGRAM] Movendo canal para categoria de arquivamento: ${archiveCategory.name}`,
              );
              await channel.setParent(archiveCategory.id);
              console.log(
                `[DEBUG-TELEGRAM] Canal movido para categoria de arquivamento`,
              );
            } else {
              console.warn(
                `Categoria de arquivamento ${DISCORD_ARCHIVE_CATEGORY_ID} não encontrada`,
              );
            }
          } catch (error) {
            console.error(`Erro ao buscar categoria de arquivamento:`, error);
          }
        }

        // Desabilitar envio de mensagens no canal
        try {
          const everyoneRole = discordGuild.roles.everyone;
          if (everyoneRole) {
            await channel.permissionOverwrites.edit(everyoneRole.id, {
              SendMessages: false,
            });
          }

          if (DISCORD_MOD_ROLE_ID) {
            try {
              const modRole =
                await discordGuild.roles.fetch(DISCORD_MOD_ROLE_ID);
              if (modRole) {
                await channel.permissionOverwrites.edit(modRole.id, {
                  SendMessages: false,
                });
              }
            } catch (error) {
              console.error(`Erro ao buscar cargo de moderador:`, error);
            }
          }
        } catch (permError) {
          console.error(
            "Erro ao desabilitar envio de mensagens no canal:",
            permError,
          );
        }
      } catch (error) {
        console.error("Error archiving channel:", error);
      }
    }
  } catch (error) {
    console.error("Error handling Discord interaction:", error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "An error occurred while processing your request.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
}

export { handleInteraction };
