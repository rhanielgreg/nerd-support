import {
  validateIntegrations,
  IntegrationValidationError,
} from "./validation.js";
import { applyConfig } from "../config.js";
import { telegramBot, discordClient, resetClients } from "../clients.js";
import { registerTelegramHandlers } from "../telegram/index.js";
import { registerDiscordHandlers } from "../discord/index.js";
import { handleReady } from "../discord/handlers/ready.js";

export function createRuntime(store, dependencies = {}) {
  let tg = telegramBot;
  let dc = discordClient;
  const buildClients =
    dependencies.buildClients ||
    ((token) => {
      resetClients(token);
      return { telegram: telegramBot, discord: discordClient };
    });
  const initializeDiscord = dependencies.initializeDiscord || handleReady;
  let state = "stopped";
  let error = null;
  let telegramName = null;
  let discordName = null;
  let polling = null;
  let generation = 0;
  const status = () => ({ state, error, telegramName, discordName });
  async function verify() {
    return validateIntegrations(store.read());
  }
  async function stop() {
    if (state === "starting")
      throw new Error("Aguarde a tentativa de conexão terminar.");
    generation++;
    try {
      tg.stop("dashboard");
    } catch {}
    await dc.destroy();
    if (polling) await polling.catch(() => {});
    polling = null;
    state = "stopped";
    error = null;
    telegramName = null;
    discordName = null;
  }
  async function start() {
    if (state === "running" || state === "starting")
      throw new Error("O bot já está conectado ou conectando.");
    state = "starting";
    error = null;
    const run = ++generation;
    try {
      const identities = await verify();
      applyConfig(store.read());
      const clients = buildClients(store.read().telegramToken);
      tg = clients.telegram;
      dc = clients.discord;
      registerTelegramHandlers(tg);
      registerDiscordHandlers({
        on(event, handler) {
          if (event !== "ready") dc.on(event, handler);
        },
      });
      dc.on("error", () => {
        error = "Erro na conexão Discord. Pare e reconecte as integrações.";
      });
      let timeout;
      try {
        await Promise.race([
          dc.login(store.read().discordToken),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error("timeout")), 20000);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      await initializeDiscord();
      polling = tg.launch({ dropPendingUpdates: false }, () => {
        if (run !== generation) return;
        state = "running";
        telegramName = identities.telegramName;
        discordName = identities.discordName;
      });
      polling.catch(async () => {
        if (run !== generation) return;
        state = "error";
        error =
          "A conexão Telegram foi interrompida. Confira se outro processo está usando este bot.";
        await dc.destroy();
      });
      return status();
    } catch (cause) {
      await dc.destroy();
      state = "error";
      error =
        cause instanceof IntegrationValidationError
          ? cause.message
          : "Falha ao iniciar os bots. Verifique as credenciais e os intents do Discord.";
      throw new Error(error);
    }
  }
  return { status, verify, start, stop };
}
