import { handleStart } from "./handlers/start.js";
import { handleHelp } from "./handlers/help.js";
import { handleNewTicket } from "./handlers/newticket.js";
import { handleMyTickets } from "./handlers/mytickets.js";
import { handleLanguage } from "./handlers/language.js";
import { handleLanguageSelection } from "./handlers/lang.js";
import { handleText } from "./handlers/text.js";
import { handleDirectClose } from "./handlers/direct_close.js";
import { handleConfirmClose } from "./handlers/confirm_close.js";
import { handleCancelClose } from "./handlers/cancel_close.js";
import { handlePhoto } from "./handlers/photo.js";
import { handleTelegramError } from "./handlers/error.js";
import { handleMenu } from "./handlers/menu.js";

function registerTelegramHandlers(telegramBot) {
  telegramBot.command(["start"], handleStart);
  telegramBot.command(["help", "ajuda", "ayuda"], handleHelp);
  telegramBot.command(
    ["newticket", "novoticket", "nuevoticket"],
    handleNewTicket,
  );
  telegramBot.command(
    ["mytickets", "meustickets", "mistickets"],
    handleMyTickets,
  );
  telegramBot.command(["language", "idioma"], handleLanguage);
  telegramBot.action(/lang_(.+)/, handleLanguageSelection);
  telegramBot.action(/^menu_(newticket|mytickets|help|language)$/, handleMenu);
  telegramBot.on("text", handleText);
  telegramBot.action(/direct_close_(.+)/, handleDirectClose);
  telegramBot.action(/confirm_close_(.+)/, handleConfirmClose);
  telegramBot.action(/cancel_close_(.+)/, handleCancelClose);
  telegramBot.on("photo", handlePhoto);
  telegramBot.catch(handleTelegramError);
}

export { registerTelegramHandlers };
