import path from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./config.js";
import { createStore } from "./dashboard/store.js";
import { createAuth } from "./dashboard/auth.js";
import { createRuntime } from "./dashboard/runtime.js";
import { loadActiveTickets } from "./storage/tickets.js";
import { loadUserLanguages } from "./storage/languages.js";
import { createHttpApp } from "./http.js";
import { protectLogs } from "./utils/secrets.js";

export async function start() {
  const baseURL = process.env.DASHBOARD_URL || `http://127.0.0.1:${PORT}`;
  const directory =
    process.env.NERD_DATA_DIR ||
    fileURLToPath(new URL("../data", import.meta.url));
  const store = createStore(path.resolve(directory));
  const auth = await createAuth(store, baseURL);
  const runtime = createRuntime(store);
  protectLogs(() => {
    const settings = store.read();
    return [settings.telegramToken, settings.discordToken];
  });
  loadUserLanguages();
  loadActiveTickets();
  const app = createHttpApp({ store, auth, runtime, baseURL });
  const server = app.listen(PORT, "127.0.0.1", () =>
    console.log(`Nerd Support: ${baseURL}`),
  );
  server.on("error", () =>
    console.error(
      "Não foi possível abrir o dashboard. Confira se a porta está disponível.",
    ),
  );
  async function shutdown() {
    await runtime.stop().catch(() => {});
    server.close();
  }
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return { server, store, runtime };
}
