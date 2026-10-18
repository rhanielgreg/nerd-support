import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export function createStore(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const keyFile = path.join(directory, "server.key");
  if (!fs.existsSync(keyFile))
    fs.writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: "wx" });
  const key = fs.readFileSync(keyFile);
  const db = new DatabaseSync(path.join(directory, "nerd-support.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL);`);
  const defaults = {
    companyName: "",
    botName: "Nerd Support",
    telegramToken: "",
    discordToken: "",
    guildId: "",
    channelId: "",
    categoryId: "",
    archiveCategoryId: "",
    modRoleId: "",
  };
  function read() {
    const row = db.prepare("SELECT payload FROM settings WHERE id=1").get();
    if (!row) return { ...defaults };
    const bytes = Buffer.from(row.payload, "base64");
    const cipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    cipher.setAuthTag(bytes.subarray(12, 28));
    return {
      ...defaults,
      ...JSON.parse(
        Buffer.concat([
          cipher.update(bytes.subarray(28)),
          cipher.final(),
        ]).toString(),
      ),
    };
  }
  function audit(actor, action) {
    db.prepare("INSERT INTO audit(actor,action,at) VALUES (?,?,?)").run(
      actor,
      action,
      new Date().toISOString(),
    );
  }
  function save(values, actor) {
    const current = read();
    for (const field of Object.keys(defaults)) {
      if (!(field in values)) continue;
      if (typeof values[field] !== "string" || values[field].length > 256)
        throw new Error("Configuração inválida.");
      const value = values[field].trim();
      if (field.endsWith("Token") && !value) continue;
      if (field.endsWith("Id") && value && !/^\d{15,22}$/.test(value))
        throw new Error("IDs do Discord devem conter de 15 a 22 números.");
      current[field] = value;
    }
    if (!current.botName || current.botName.length > 80)
      throw new Error("Informe um nome de até 80 caracteres.");
    if (current.categoryId && current.categoryId === current.archiveCategoryId)
      throw new Error(
        "As categorias de tickets e arquivo devem ser diferentes.",
      );
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(current)),
      cipher.final(),
    ]);
    const payload = Buffer.concat([
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]).toString("base64");
    db.prepare("INSERT OR REPLACE INTO settings(id,payload) VALUES (1,?)").run(
      payload,
    );
    audit(actor, "Configurações atualizadas");
    return publicSettings();
  }
  function publicSettings() {
    const { telegramToken, discordToken, ...settings } = read();
    return {
      ...settings,
      telegramConfigured: !!telegramToken,
      discordConfigured: !!discordToken,
    };
  }
  return {
    db,
    read,
    save,
    publicSettings,
    audit,
    key,
    history: () =>
      db
        .prepare("SELECT actor,action,at FROM audit ORDER BY id DESC LIMIT 20")
        .all(),
  };
}
