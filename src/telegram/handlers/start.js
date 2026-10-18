import { userLanguages } from "../../state.js";
import {
  detectLanguage,
  getUserLanguage,
  setUserLanguage,
  getTranslation,
} from "../../i18n/index.js";
import { getMainMenu } from "../menu.js";

async function handleStart(ctx) {
  console.log("Command /start received");
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || "user";

  // Detectar idioma com base no nome do usuário
  const detectedLang = detectLanguage(firstName);
  if (!userLanguages[userId]) {
    setUserLanguage(userId, detectedLang);
  }

  const lang = getUserLanguage(userId);

  await ctx.reply(
    getTranslation("welcome", lang, firstName),
    getMainMenu(lang),
  );
}

export { handleStart };
