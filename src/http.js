import express from "express";
import { fileURLToPath } from "node:url";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { activeTickets } from "./state.js";
import { sendToTelegramAPI } from "./telegram/api.js";
import { createHash, timingSafeEqual } from "node:crypto";

export function createHttpApp({
  store,
  auth,
  runtime,
  baseURL,
  setupCode = "",
  behindProxy = false,
}) {
  const app = express();
  app.disable("x-powered-by");
  if (behindProxy) app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (baseURL.startsWith("https://"))
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    );
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== baseURL
    )
      return res.status(403).json({ error: "Origem inválida." });
    next();
  });
  const initialized = () =>
    !!store.db.prepare("SELECT id FROM user LIMIT 1").get();
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.all(
    "/api/auth/*",
    (req, res, next) => {
      const endpoint = req.path.slice("/api/auth/".length);
      if (
        !["sign-in/email", "sign-out", "get-session", "ok"].includes(endpoint)
      )
        return res.status(404).json({ error: "Rota indisponível." });
      next();
    },
    toNodeHandler(auth),
  );
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/setup", (_req, res) =>
    res.json({
      initialized: initialized(),
      setupAvailable: setupCode.length >= 32 && setupCode.length <= 256,
    }),
  );
  let settingUp = false;
  let attempts = 0;
  let attemptsReset = Date.now() + 60000;
  app.post("/api/setup", async (req, res) => {
    if (settingUp || initialized())
      return res
        .status(409)
        .json({ error: "A conta de administração já foi criada." });
    if (setupCode.length < 32 || setupCode.length > 256)
      return res
        .status(503)
        .json({
          error:
            "Cadastro bloqueado. Configure SETUP_CODE no ambiente do servidor com pelo menos 32 caracteres.",
        });
    if (Date.now() >= attemptsReset) {
      attempts = 0;
      attemptsReset = Date.now() + 60000;
    }
    if (attempts >= 5)
      return res
        .status(429)
        .json({ error: "Muitas tentativas de instalação. Aguarde um minuto." });
    const supplied = req.body?.setupCode;
    const hash = (value) => createHash("sha256").update(value).digest();
    if (
      typeof supplied !== "string" ||
      supplied.length > 256 ||
      !timingSafeEqual(hash(supplied), hash(setupCode))
    ) {
      attempts++;
      return res.status(403).json({ error: "Código de instalação inválido." });
    }
    const { name, email, password } = req.body;
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.length > 80 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    )
      return res.status(400).json({
        error: "Informe nome, e-mail válido e senha de 12 a 128 caracteres.",
      });
    settingUp = true;
    try {
      await auth.api.signUpEmail({
        body: { name: name.trim(), email, password },
      });
      store.audit(email, "Administrador criado");
      res.status(201).json({ ok: true });
    } catch {
      res
        .status(400)
        .json({ error: "Não foi possível criar a conta. Confira os dados." });
    } finally {
      settingUp = false;
    }
  });
  app.use("/api", async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session)
        return res
          .status(401)
          .json({ error: "Entre na sua conta para continuar." });
      req.user = session.user;
      next();
    } catch {
      res.status(401).json({ error: "Sessão inválida." });
    }
  });
  app.get("/api/dashboard", (req, res) =>
    res.json({
      user: { name: req.user.name, email: req.user.email },
      settings: store.publicSettings(),
      runtime: runtime.status(),
      tickets: activeTickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        username: t.username,
        createdAt: t.createdAt,
      })),
      history: store.history(),
    }),
  );
  app.put("/api/settings", (req, res) => {
    if (["running", "starting"].includes(runtime.status().state))
      return res
        .status(409)
        .json({ error: "Pare os bots antes de alterar as configurações." });
    try {
      res.json(store.save(req.body, req.user.email));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  for (const action of ["verify", "start", "stop"]) {
    app.post(`/api/bot/${action}`, async (req, res) => {
      try {
        const result = await runtime[action]();
        store.audit(
          req.user.email,
          {
            verify: "Integrações validadas",
            start: "Inicialização solicitada",
            stop: "Bots parados",
          }[action],
        );
        res.json(result || runtime.status());
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
  }
  app.post("/api/bot/test", async (req, res) => {
    if (runtime.status().state !== "running")
      return res
        .status(409)
        .json({ error: "Conecte os bots antes de testar." });
    if (
      typeof req.body.userId !== "string" ||
      !/^\d{1,20}$/.test(req.body.userId)
    )
      return res
        .status(400)
        .json({ error: "Informe o ID numérico do usuário Telegram." });
    const ok = await sendToTelegramAPI(
      req.body.userId,
      "Conexão de teste do Nerd Support funcionando!",
      "TEST",
      { isClosingMessage: true },
    );
    if (!ok)
      return res.status(400).json({
        error:
          "Envio falhou. Abra a conversa com o bot e envie /start antes de testar.",
      });
    store.audit(req.user.email, "Mensagem de teste enviada");
    res.json({ ok: true });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Rota não encontrada." }),
  );
  app.use(
    express.static(
      fileURLToPath(new URL("./dashboard/public", import.meta.url)),
    ),
  );
  app.use((error, _req, res, _next) =>
    res
      .status(400)
      .json({ error: "Não foi possível processar a solicitação." }),
  );
  return app;
}
