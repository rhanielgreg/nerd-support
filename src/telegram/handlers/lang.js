import { setUserLanguage, getTranslation } from "../../i18n/index.js";
import { getMainMenu } from "../menu.js";

async function handleLanguageSelection(ctx) {
  const lang = ctx.match[1];
  const userId = ctx.from.id;

  setUserLanguage(userId, lang);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    getTranslation("languageChanged", lang),
    getMainMenu(lang),
  );
}

export { handleLanguageSelection };
