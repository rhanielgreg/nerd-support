import { TELEGRAM_API_URL, BOT_DISPLAY_NAME } from "../config.js";
import { getUserLanguage, getTranslation } from "../i18n/index.js";
import { escapeMarkdown } from "../utils/markdown.js";
import axios from "axios";

async function sendToTelegramAPI(userId, message, ticketId, options = {}) {
  try {
    console.log(
      `Sending to Telegram API (${userId}): ${message.substring(0, 30)}...`,
    );

    // Verificar se o userId é válido
    if (!userId) {
      console.error("Invalid Telegram user ID");
      return false;
    }

    // Obter o idioma do usuário
    const lang = getUserLanguage(userId);

    // Preparar a mensagem
    let text = "";

    // Se for uma mensagem de fechamento, manter o formato original
    if (options.isClosingMessage) {
      text = getTranslation(
        "supportReply",
        lang,
        escapeMarkdown(ticketId),
        escapeMarkdown(message),
      );
    } else {
      // Caso contrário, usar o formato simplificado
      text = `${escapeMarkdown(BOT_DISPLAY_NAME)}: ${escapeMarkdown(message)}`;
    }

    // Configurar o teclado com botões, se necessário
    let keyboard = undefined;

    // Adicionar botões apenas se não for uma mensagem de fechamento de ticket
    if (!options.isClosingMessage) {
      // Adicionar botão para fechar o ticket
      const closeButtonText = getTranslation("closeTicketButton", lang);

      keyboard = {
        inline_keyboard: [
          [
            {
              text: closeButtonText,
              callback_data: `direct_close_${ticketId}`,
            },
          ],
        ],
      };
    }

    // Tentar enviar com MarkdownV2
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: userId,
        text: text,
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });

      if (response.data && response.data.ok) {
        console.log(`Message sent successfully to Telegram API (${userId})`);
        return true;
      }
    } catch (markdownError) {
      console.error(
        "Error sending with MarkdownV2:",
        markdownError.response
          ? markdownError.response.data
          : markdownError.message,
      );

      // Tentar enviar sem formatação
      try {
        const plainText = options.isClosingMessage
          ? `Support:\n\n${message}\n\n`
          : `${BOT_DISPLAY_NAME}: ${message}`;

        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
          chat_id: userId,
          text: plainText,
          reply_markup: keyboard,
        });

        if (response.data && response.data.ok) {
          console.log(
            `Plain message sent successfully to Telegram API (${userId})`,
          );
          return true;
        } else {
          console.error("Error in Telegram API response:", response.data);
          return false;
        }
      } catch (plainError) {
        console.error(
          "Error sending plain message:",
          plainError.response ? plainError.response.data : plainError.message,
        );
        return false;
      }
    }
  } catch (error) {
    console.error(
      "Error sending to Telegram API:",
      error.response ? error.response.data : error.message,
    );
    return false;
  }
}

async function sendImageToTelegram(userId, imageUrl, caption, ticketId) {
  try {
    console.log(`Sending image to Telegram (${userId}): ${imageUrl}`);

    // Verificar se o userId é válido
    if (!userId) {
      console.error("Invalid Telegram user ID");
      return false;
    }

    // Obter o idioma do usuário
    const lang = getUserLanguage(userId);

    // Preparar a legenda
    let text = "";
    if (caption && caption.trim() !== "") {
      // Se tiver legenda, usar apenas o nome configurado seguido da mensagem
      text = `${BOT_DISPLAY_NAME}: ${caption}`;
    } else {
      // Se não tiver legenda, usar apenas o nome configurado
      text = `${BOT_DISPLAY_NAME}:`;
    }

    // Configurar o teclado com botões, se necessário
    let keyboard = undefined;

    // Adicionar botão para fechar o ticket
    const closeButtonText = getTranslation("closeTicketButton", lang);

    keyboard = {
      inline_keyboard: [
        [{ text: closeButtonText, callback_data: `direct_close_${ticketId}` }],
      ],
    };

    // Enviar a imagem
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, {
        chat_id: userId,
        photo: imageUrl,
        caption: text,
        reply_markup: keyboard,
      });

      if (response.data && response.data.ok) {
        console.log(`Image sent successfully to Telegram API (${userId})`);
        return true;
      } else {
        console.error("Error in Telegram API response:", response.data);
        return false;
      }
    } catch (error) {
      console.error(
        "Error sending image to Telegram:",
        error.response ? error.response.data : error.message,
      );

      // Se falhar ao enviar a imagem, enviar apenas uma mensagem de erro sem o link da imagem
      try {
        const errorMessage = `${BOT_DISPLAY_NAME}: ${getTranslation("imageFailedToSend", lang) || "Não foi possível enviar a imagem."}`;

        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
          chat_id: userId,
          text: errorMessage,
          reply_markup: keyboard,
        });

        if (response.data && response.data.ok) {
          console.log(
            `Error message sent successfully to Telegram API (${userId})`,
          );
          return true;
        } else {
          console.error(
            "Error in Telegram API response for error message:",
            response.data,
          );
          return false;
        }
      } catch (errorMessageError) {
        console.error(
          "Error sending error message:",
          errorMessageError.response
            ? errorMessageError.response.data
            : errorMessageError.message,
        );
        return false;
      }
    }
  } catch (error) {
    console.error("Error in sendImageToTelegram:", error);
    return false;
  }
}

export { sendToTelegramAPI, sendImageToTelegram };
