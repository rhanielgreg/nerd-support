import "./config.js";
import { getDeploymentConfig } from "./deployment.js";
import { configureStorage } from "./storage/paths.js";
import { createStore } from "./dashboard/store.js";
import { createAuth } from "./dashboard/auth.js";
import { createRuntime } from "./dashboard/runtime.js";
import { loadActiveTickets } from "./storage/tickets.js";
import { loadUserLanguages } from "./storage/languages.js";
import { createHttpApp } from "./http.js";
import { protectLogs } from "./utils/secrets.js";

export async function start() {
  const deployment = getDeploymentConfig();
  const { baseURL, dataDirectory, setupCode } = deployment;
  configureStorage(dataDirectory);
  const store = createStore(dataDirectory);
  const auth = await createAuth(store, baseURL, deployment);
  const runtime = createRuntime(store);
  protectLogs(() => {
    const settings = store.read();
    return [settings.telegramToken, settings.discordToken, setupCode];
  });
  loadUserLanguages();
  loadActiveTickets();
  const app = createHttpApp({
    store,
    auth,
    runtime,
    baseURL,
    setupCode,
    behindProxy: deployment.behindProxy,
  });
  const server = app.listen(deployment.port, deployment.host, () =>
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
