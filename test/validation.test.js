import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { validateIntegrations } from "../src/dashboard/validation.js";

test("diagnóstico identifica etapa, servidor desconhecido e falhas sem divulgar segredos", async () => {
  const original = axios.get;
  const config = {
    telegramToken: "secret-telegram",
    discordToken: "secret-discord",
    guildId: "123456789012345678",
  };
  const good = (url) =>
    url.includes("api.telegram.org")
      ? { data: { ok: true, result: { is_bot: true, username: "qa" } } }
      : { data: { bot: true, username: "qa" } };
  try {
    for (const [route, failure, expected] of [
      ["/getMe", { response: { status: 401 } }, /Telegram: Token inválido/],
      [
        "/users/@me",
        { response: { status: 401 } },
        /Token Discord: Token inválido/,
      ],
      [
        "/guilds/",
        { response: { status: 404, data: { code: 10004 } } },
        /Servidor Discord: Servidor não encontrado.*10004/,
      ],
      [
        "/guilds/",
        { response: { status: 403 } },
        /Servidor Discord: O bot não tem acesso/,
      ],
      ["/getMe", { code: "ECONNABORTED" }, /Telegram: A plataforma demorou/],
      ["/getMe", { code: "ENOTFOUND" }, /Telegram: Falha de rede/],
      [
        "/getMe",
        { response: { status: 429 } },
        /Telegram: Limite de requisições/,
      ],
    ]) {
      axios.get = async (url) => {
        if (url.includes(route))
          throw Object.assign(
            new Error("secret-telegram secret-discord"),
            failure,
          );
        return good(url);
      };
      await assert.rejects(validateIntegrations(config), (error) => {
        assert.match(error.message, expected);
        assert.ok(!error.message.includes("secret-"));
        return true;
      });
    }
    axios.get = async (url) =>
      url.includes("/channels/")
        ? { data: { guild_id: "outro", type: 4 } }
        : good(url);
    await assert.rejects(
      validateIntegrations({ ...config, categoryId: "123456789012345679" }),
      /Categoria de tickets:.*outro servidor/,
    );
    axios.get = async (url) =>
      url.includes("/channels/")
        ? { data: { guild_id: config.guildId, type: 0 } }
        : good(url);
    await assert.rejects(
      validateIntegrations({ ...config, categoryId: "123456789012345679" }),
      /não de uma categoria/,
    );
    axios.get = async (url) => good(url);
    assert.deepEqual(await validateIntegrations(config), {
      telegramName: "qa",
      discordName: "qa",
    });
  } finally {
    axios.get = original;
  }
});
