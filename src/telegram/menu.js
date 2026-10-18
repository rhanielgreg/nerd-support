import { Markup } from "telegraf";
import { getTranslation } from "../i18n/index.js";

export function getMainMenu(language) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        getTranslation("newTicketButton", language),
        "menu_newticket",
      ),
    ],
    [
      Markup.button.callback(
        getTranslation("myTicketsButton", language),
        "menu_mytickets",
      ),
    ],
    [
      Markup.button.callback(
        getTranslation("helpButton", language),
        "menu_help",
      ),
      Markup.button.callback(
        getTranslation("languageButton", language),
        "menu_language",
      ),
    ],
  ]);
}
