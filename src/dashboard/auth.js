import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

export async function createAuth(store, baseURL) {
  const options = {
    appName: "Nerd Support",
    baseURL,
    secret: store.key.toString("hex"),
    database: store.db,
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    session: { expiresIn: 60 * 60 * 12 },
    rateLimit: { enabled: true, window: 60, max: 30 },
    trustedOrigins: [baseURL],
  };
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
  return betterAuth(options);
}
