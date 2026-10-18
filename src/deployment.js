import path from "node:path";
import { fileURLToPath } from "node:url";

export function getDeploymentConfig(env = process.env) {
  const railway = !!(env.RAILWAY_PROJECT_ID || env.RAILWAY_ENVIRONMENT_ID);
  const production = railway || env.NODE_ENV === "production";
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT deve ser uma porta válida.");
  const rawURL =
    env.DASHBOARD_URL ||
    (env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://127.0.0.1:${port}`);
  let url;
  try {
    url = new URL(rawURL);
  } catch {
    throw new Error("DASHBOARD_URL deve ser uma URL válida.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "DASHBOARD_URL deve conter somente a origem, sem caminho ou credenciais.",
    );
  if (production && url.protocol !== "https:")
    throw new Error(
      "Configure DASHBOARD_URL com o domínio HTTPS do dashboard.",
    );
  const dataDirectory = path.resolve(
    env.NERD_DATA_DIR ||
      env.RAILWAY_VOLUME_MOUNT_PATH ||
      fileURLToPath(new URL("../data", import.meta.url)),
  );
  if (railway) {
    if (!env.RAILWAY_VOLUME_MOUNT_PATH)
      throw new Error(
        "Adicione um volume persistente ao serviço Railway antes de iniciar.",
      );
    const relative = path.relative(
      path.resolve(env.RAILWAY_VOLUME_MOUNT_PATH),
      dataDirectory,
    );
    if (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      throw new Error(
        "NERD_DATA_DIR deve estar dentro do volume persistente do Railway.",
      );
  }
  const setupCode = env.SETUP_CODE || "";
  if (setupCode && (setupCode.length < 32 || setupCode.length > 256))
    throw new Error("SETUP_CODE deve conter de 32 a 256 caracteres.");
  return {
    port,
    host: env.HOST || (production ? "0.0.0.0" : "127.0.0.1"),
    baseURL: url.origin,
    dataDirectory,
    setupCode,
    behindProxy: railway || env.TRUST_PROXY === "1",
    production,
  };
}
