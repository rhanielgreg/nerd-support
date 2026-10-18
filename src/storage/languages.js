import { userLanguages } from "../state.js";
import fs from "node:fs";

export function loadUserLanguages() {
  if (fs.existsSync("user_languages.json")) {
    try {
      const data = fs.readFileSync("user_languages.json", "utf8");
      Object.assign(userLanguages, JSON.parse(data));
      console.log("User languages loaded");
    } catch (error) {
      console.error("Error loading user languages:", error);
      // Manter o objeto compartilhado vazio em caso de erro.
    }
  }
}

function saveUserLanguages() {
  try {
    fs.writeFileSync(
      "user_languages.json",
      JSON.stringify(userLanguages, null, 2),
    );
  } catch (error) {
    console.error("Error saving user languages:", error);
  }
}

export { saveUserLanguages };
