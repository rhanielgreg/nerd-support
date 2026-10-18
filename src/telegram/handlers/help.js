import { getUserLanguage, getTranslation } from "../../i18n/index.js";
import { getMainMenu } from "../menu.js";

async function handleHelp(ctx) {
  console.log("Help command received");
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  try {
    const helpText = getTranslation("help", lang);
    await ctx.reply(helpText, {
      parse_mode: "MarkdownV2",
      ...getMainMenu(lang),
    });
  } catch (error) {
    console.error("Error sending help message with MarkdownV2:", error);
    // Tentar sem formatação
    await ctx.reply(
      getTranslation("help", lang).replace(/\*/g, ""),
      getMainMenu(lang),
    );
  }
}

export { handleHelp };
