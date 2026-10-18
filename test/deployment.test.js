import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { getDeploymentConfig } from "../src/deployment.js";
import { configureStorage, dataFile } from "../src/storage/paths.js";
import { createStore } from "../src/dashboard/store.js";
import { createAuth } from "../src/dashboard/auth.js";
import { createHttpApp } from "../src/http.js";
import { activeTickets, userLanguages } from "../src/state.js";
import {
  saveActiveTickets,
  loadActiveTickets,
} from "../src/storage/tickets.js";
import {
  saveUserLanguages,
  loadUserLanguages,
} from "../src/storage/languages.js";

test("Railway: host público, porta dinâmica, URL HTTPS fixa e diretório no volume", () => {
  const env = {
    RAILWAY_PROJECT_ID: "test-project",
    RAILWAY_PUBLIC_DOMAIN: "nerd-test.up.railway.app",
    RAILWAY_VOLUME_MOUNT_PATH: "/data",
    PORT: "8080",
  };
  const config = getDeploymentConfig(env);
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 8080);
  assert.equal(config.baseURL, "https://nerd-test.up.railway.app");
  assert.equal(config.dataDirectory, path.resolve("/data"));
  assert.equal(config.behindProxy, true);
  assert.throws(
    () =>
      getDeploymentConfig({ ...env, DASHBOARD_URL: "http://public.example" }),
    /HTTPS/,
  );
  assert.throws(
    () => getDeploymentConfig({ ...env, NERD_DATA_DIR: "/elsewhere" }),
    /dentro do volume/,
  );
  assert.throws(
    () => getDeploymentConfig({ ...env, RAILWAY_VOLUME_MOUNT_PATH: "" }),
    /volume persistente/,
  );
  assert.throws(
    () => getDeploymentConfig({ ...env, SETUP_CODE: "short" }),
    /32 a 256/,
  );
  assert.throws(() => getDeploymentConfig({ PORT: "invalid" }), /PORT/);
  assert.equal(getDeploymentConfig({}).host, "127.0.0.1");
  assert.equal(
    getDeploymentConfig({ DASHBOARD_URL: "http://localhost:3000/" }).baseURL,
    "http://localhost:3000",
  );
});

test("persistência: migra JSONs sem substituir dados e recupera tickets e idiomas no volume", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nerd-volume-"));
  try {
    const legacy = path.join(directory, "legacy");
    const volume = path.join(directory, "volume");
    fs.mkdirSync(legacy);
    fs.writeFileSync(
      path.join(legacy, "active_tickets.json"),
      JSON.stringify([{ id: "42_1", status: "open" }]),
    );
    fs.writeFileSync(
      path.join(legacy, "user_languages.json"),
      JSON.stringify({ 42: "pt" }),
    );
    configureStorage(volume, legacy);
    assert.equal(
      dataFile("active_tickets.json"),
      path.join(volume, "active_tickets.json"),
    );
    loadActiveTickets();
    loadUserLanguages();
    assert.equal(activeTickets[0].id, "42_1");
    assert.equal(userLanguages[42], "pt");
    activeTickets[0].subject = "Atualizado";
    userLanguages[42] = "es";
    saveActiveTickets();
    saveUserLanguages();
    configureStorage(volume, legacy);
    activeTickets.length = 0;
    delete userLanguages[42];
    loadActiveTickets();
    loadUserLanguages();
    assert.equal(activeTickets[0].subject, "Atualizado");
    assert.equal(userLanguages[42], "es");
    const store = createStore(volume);
    store.save({ botName: "Teste" }, "test@example.test");
    store.db.close();
    const restored = createStore(volume);
    assert.equal(restored.read().botName, "Teste");
    restored.db.close();
    fs.renameSync(
      path.join(volume, "server.key"),
      path.join(volume, "original.key"),
    );
    assert.throws(() => createStore(volume), /sem server.key/);
    assert.equal(fs.existsSync(path.join(volume, "server.key")), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("HTTPS: cookies Secure, cadastro bloqueado sem código e tentativas limitadas", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nerd-https-"));
  const store = createStore(directory);
  const baseURL = "https://nerd-test.example";
  const auth = await createAuth(store, baseURL, { behindProxy: true });
  const runtime = { status: () => ({ state: "stopped" }) };
  const server = createHttpApp({
    store,
    auth,
    runtime,
    baseURL,
    behindProxy: true,
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const account = {
    name: "QA Admin",
    email: "qa@example.test",
    password: "Fictional-QA-password-only-123",
  };
  const headers = {
    Origin: baseURL,
    "Content-Type": "application/json",
    "X-Forwarded-Proto": "https",
  };
  let secureServer;
  try {
    assert.equal((await fetch(origin + "/health")).status, 200);
    const setup = await (await fetch(origin + "/api/setup")).json();
    assert.equal(setup.setupAvailable, false);
    assert.equal(
      (
        await fetch(origin + "/api/setup", {
          method: "POST",
          headers,
          body: JSON.stringify(account),
        })
      ).status,
      503,
    );
    const setupCode = "fictional-setup-code-for-HTTPS-tests-123456";
    secureServer = createHttpApp({
      store,
      auth,
      runtime,
      baseURL,
      behindProxy: true,
      setupCode,
    }).listen(0, "127.0.0.1");
    await once(secureServer, "listening");
    const secureOrigin = `http://127.0.0.1:${secureServer.address().port}`;
    const request = (body, route = "/api/setup") =>
      fetch(secureOrigin + route, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    assert.equal((await request({ ...account, setupCode })).status, 201);
    const login = await request(account, "/api/auth/sign-in/email");
    assert.equal(login.status, 200, await login.clone().text());
    assert.match(login.headers.get("set-cookie"), /; Secure/i);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(login.headers.get("strict-transport-security"), /max-age/);
    assert.equal((await request({ ...account, setupCode })).status, 409);
    store.db.prepare("DELETE FROM session").run();
    store.db.prepare("DELETE FROM account").run();
    store.db.prepare("DELETE FROM user").run();
    for (let i = 0; i < 5; i++)
      assert.equal(
        (await request({ ...account, setupCode: "wrong" })).status,
        403,
      );
    assert.equal((await request({ ...account, setupCode })).status, 429);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (secureServer)
      await new Promise((resolve) => secureServer.close(resolve));
    store.db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
