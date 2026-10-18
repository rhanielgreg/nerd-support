import { userLanguages } from "../state.js";
import { saveUserLanguages } from "../storage/languages.js";
import { translations } from "./translations.js";
import { franc } from "franc";

function detectLanguage(text) {
  try {
    const langCode = franc(text, { minLength: 3 });
    if (langCode === "und") return "en"; // Default to English if undetermined
    return langCode === "por" ? "pt" : langCode === "spa" ? "es" : "en";
  } catch (error) {
    console.error("Error detecting language:", error);
    return "en"; // Default to English on error
  }
}

// Função para obter o idioma preferido de um usuário
function getUserLanguage(userId) {
  return userLanguages[userId] || "en"; // Default to English
}

// Função para definir o idioma preferido de um usuário
function setUserLanguage(userId, language) {
  userLanguages[userId] = language;
  saveUserLanguages();
}

function getTranslation(key, language, ...args) {
  const translation =
    translations[language] && translations[language][key]
      ? translations[language][key]
      : translations.en[key];

  if (args.length > 0) {
    let result = translation;
    for (let i = 0; i < args.length; i++) {
      result = result.replace("%s", args[i] || "");
    }
    return result;
  }

  return translation;
}

export { detectLanguage, getUserLanguage, setUserLanguage, getTranslation };
