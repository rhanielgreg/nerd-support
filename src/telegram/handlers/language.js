import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { Markup } from "telegraf";

async function handleLanguage(ctx) {
  console.log("Language command received");
  const userId = ctx.from.id;

  await ctx.reply(
    getTranslation("selectLanguage", getUserLanguage(userId)),
    Markup.inlineKeyboard([
      [Markup.button.callback("English 🇬🇧", "lang_en")],
      [Markup.button.callback("Português 🇧🇷", "lang_pt")],
      [Markup.button.callback("Español 🇪🇸", "lang_es")],
    ]),
  );
}

export { handleLanguage };
