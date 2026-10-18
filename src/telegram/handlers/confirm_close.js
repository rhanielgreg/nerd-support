import {
  DISCORD_ARCHIVE_CATEGORY_ID,
  DISCORD_MOD_ROLE_ID,
} from "../../config.js";
import { activeTickets, userSessions } from "../../state.js";
import { discordClient, discordGuild } from "../../clients.js";
import { saveActiveTickets } from "../../storage/tickets.js";
import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { EmbedBuilder } from "discord.js";

async function handleConfirmClose(ctx) {
  console.log("Confirm close action received");
  const ticketId = ctx.match[1];
  console.log(
    `[DEBUG-TELEGRAM] ID do ticket extraído do botão confirm_close_: ${ticketId}`,
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

  // Fechar o ticket
  console.log(`[DEBUG-TELEGRAM] Fechando o ticket: ${ticket.id}`);
  const index = activeTickets.findIndex((t) => t.id === ticket.id);

  if (index === -1) {
    console.log(
      `[DEBUG-TELEGRAM] Ticket não encontrado na lista de ativos: ${ticket.id}`,
    );
    return ctx.answerCbQuery(getTranslation("ticketNotFound", lang));
  }

  // Remover o ticket da lista de ativos
  activeTickets.splice(index, 1);
  saveActiveTickets();
  console.log(
    `[DEBUG-TELEGRAM] Ticket removido da lista de ativos: ${ticket.id}`,
  );

  // Limpar sessão do usuário
  if (userSessions[userId]) {
    delete userSessions[userId];
    console.log(`[DEBUG-TELEGRAM] Sessão do usuário removida: ${userId}`);
  }

  try {
    await ctx.answerCbQuery("Ticket closed successfully");

    // Enviar mensagem de confirmação
    await ctx.editMessageText(
      getTranslation("ticketClosed", lang, ticket.id, ticket.subject),
    );

    // Notificar o Discord que o ticket foi fechado
    if (ticket.discordChannelId) {
      try {
        const channel = await discordClient.channels.fetch(
          ticket.discordChannelId,
        );

        // Enviar mensagem de fechamento
        const embed = new EmbedBuilder()
          .setTitle(`Ticket #${ticket.id} Closed`)
          .setDescription(
            `The ticket "${ticket.subject}" was closed by the user.`,
          )
          .setColor(0xff0000)
          .setFooter({ text: `Ticket ID: ${ticket.id}` })
          .setTimestamp();

        await channel.send({
          content: `**Ticket #${ticket.id} Closed by User**`,
          embeds: [embed],
        });

        // Arquivar o canal
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
        const everyoneRole = discordGuild.roles.everyone;
        if (everyoneRole) {
          await channel.permissionOverwrites.edit(everyoneRole.id, {
            SendMessages: false,
          });
        }

        if (DISCORD_MOD_ROLE_ID) {
          try {
            const modRole = await discordGuild.roles.fetch(DISCORD_MOD_ROLE_ID);
            if (modRole) {
              await channel.permissionOverwrites.edit(modRole.id, {
                SendMessages: false,
              });
            }
          } catch (error) {
            console.error(`Erro ao buscar cargo de moderador:`, error);
          }
        }
      } catch (error) {
        console.error(
          `Error handling Discord channel for ticket ${ticket.id}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("Error closing ticket:", error);
    await ctx.answerCbQuery("Error closing ticket");
  }
}

export { handleConfirmClose };
