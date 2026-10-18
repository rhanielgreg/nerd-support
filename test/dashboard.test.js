import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import axios from "axios";
import { createStore } from "../src/dashboard/store.js";
import { createAuth } from "../src/dashboard/auth.js";
import { createRuntime } from "../src/dashboard/runtime.js";
import { createHttpApp } from "../src/http.js";
import { redact } from "../src/utils/secrets.js";

test("logs removem tokens e credenciais de URLs do Telegram", () => {
  const output = redact(
    {
      url: "https://api.telegram.org/file/bot123456:secret/test.jpg",
      authorization: "Bot discord-secret",
    },
    ["discord-secret"],
  );
  assert.ok(!output.includes("123456:secret"));
  assert.ok(!output.includes("discord-secret"));
  assert.match(output, /REDACTED/);
});

test("dashboard: instalação vazia, autenticação, proteção, configuração e persistência", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nerd-dashboard-"));
  let store = createStore(directory);
  const baseURL = "http://127.0.0.1:3000";
  const auth = await createAuth(store, baseURL);
  const runtime = createRuntime(store);
  const server = createHttpApp({ store, auth, runtime, baseURL }).listen(
    0,
    "127.0.0.1",
  );
  await once(server, "listening");
  const address = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  async function request(
    route,
    method = "GET",
    body,
    authenticated = true,
    origin = baseURL,
  ) {
    return fetch(address + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  try {
    assert.deepEqual(await (await request("/api/setup")).json(), {
      initialized: false,
    });
    assert.equal((await request("/api/dashboard")).status, 401);
    assert.equal(
      (await request("/api/settings", "PUT", { botName: "Intruso" })).status,
      401,
    );
    assert.equal((await request("/test-telegram/42/hello")).status, 404);
    assert.equal(
      (await request("/api/auth/sign-up/email", "POST", {})).status,
      404,
    );
    assert.equal(
      (
        await request("/api/setup", "POST", {
          name: "Teste",
          email: "test@example.com",
          password: "short",
        })
      ).status,
      400,
    );
    const account = {
      name: "Administrador Teste",
      email: "test@example.com",
      password: "Password-only-for-test-123!",
    };
    assert.equal(
      (
        await request(
          "/api/setup",
          "POST",
          account,
          false,
          "https://invalid.example",
        )
      ).status,
      403,
    );
    assert.equal((await request("/api/setup", "POST", account)).status, 201);
    assert.equal((await request("/api/setup", "POST", account)).status, 409);
    assert.equal(
      (
        await request("/api/auth/sign-in/email", "POST", {
          email: account.email,
          password: "incorrect-password",
        })
      ).status,
      401,
    );
    const login = await request("/api/auth/sign-in/email", "POST", account);
    assert.equal(login.status, 200, await login.clone().text());
    cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    assert.ok(cookie);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
    let dashboard = await (await request("/api/dashboard")).json();
    assert.equal(dashboard.runtime.state, "stopped");
    assert.equal(dashboard.settings.telegramConfigured, false);
    assert.equal(dashboard.settings.discordConfigured, false);
    const values = {
      companyName: "Cliente QA",
      botName: "Suporte QA",
      telegramToken: "123456:secret-telegram-for-test",
      discordToken: "secret-discord-for-test",
      guildId: "123456789012345678",
    };
    assert.equal(
      (await request("/api/settings", "PUT", { guildId: "invalid" })).status,
      400,
    );
    assert.equal((await request("/api/settings", "PUT", values)).status, 200);
    assert.equal(
      (
        await request("/api/settings", "PUT", {
          botName: "Suporte QA atualizado",
          telegramToken: "",
          discordToken: "",
        })
      ).status,
      200,
    );
    dashboard = await (await request("/api/dashboard")).json();
    assert.equal(dashboard.settings.botName, "Suporte QA atualizado");
    assert.equal(dashboard.settings.telegramConfigured, true);
    assert.equal(dashboard.settings.telegramToken, undefined);
    assert.equal(dashboard.settings.discordToken, undefined);
    assert.ok(!JSON.stringify(dashboard).includes("secret-telegram"));
    assert.ok(
      !store.db
        .prepare("SELECT payload FROM settings")
        .get()
        .payload.includes("secret-telegram"),
    );
    assert.equal(store.read().telegramToken, values.telegramToken);
    assert.equal(
      (await request("/api/bot/test", "POST", { userId: "42" })).status,
      409,
    );
    assert.equal((await request("/api/auth/sign-out", "POST", {})).status, 200);
    assert.equal((await request("/api/dashboard")).status, 401);
    // Reabrir o SQLite deve recuperar os mesmos dados e a mesma chave.
    store.db.close();
    store = createStore(directory);
    assert.equal(store.read().botName, "Suporte QA atualizado");
    assert.equal(store.read().discordToken, values.discordToken);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    store.db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("runtime: validação, iniciar, impedir duplicação, parar e reconectar sem rede", async () => {
  const originalGet = axios.get;
  const values = {
    telegramToken: "test-token",
    discordToken: "test-token",
    guildId: "123456789012345678",
    botName: "Nerd QA",
  };
  let stopped = 0;
  let destroyed = 0;
  let resolvePolling;
  const runtime = createRuntime(
    { read: () => values },
    {
      buildClients: () => ({
        telegram: {
          command() {},
          action() {},
          on() {},
          catch() {},
          launch(_config, onReady) {
            onReady();
            return new Promise((resolve) => {
              resolvePolling = resolve;
            });
          },
          stop() {
            stopped++;
            resolvePolling?.();
          },
        },
        discord: {
          on() {},
          login: async () => {},
          destroy: async () => {
            destroyed++;
          },
        },
      }),
      initializeDiscord: async () => {},
    },
  );
  axios.get = async (url) =>
    url.includes("api.telegram.org")
      ? {
          data: {
            ok: true,
            result: { is_bot: true, username: "test_nerd_bot" },
          },
        }
      : { data: { bot: true, username: "test-discord" } };
  try {
    assert.equal(runtime.status().state, "stopped");
    assert.equal((await runtime.verify()).telegramName, "test_nerd_bot");
    await runtime.start();
    assert.equal(runtime.status().state, "running");
    await assert.rejects(runtime.start(), /já está/);
    await runtime.stop();
    assert.equal(runtime.status().state, "stopped");
    await runtime.start();
    await runtime.stop();
    assert.equal(stopped, 2);
    assert.equal(destroyed, 2);
    axios.get = async () => {
      throw new Error("https://example.com/test-token");
    };
    await assert.rejects(runtime.start(), /Telegram: Falha de rede/);
    assert.equal(runtime.status().state, "error");
    assert.ok(!runtime.status().error.includes("test-token"));
  } finally {
    axios.get = originalGet;
  }
});
