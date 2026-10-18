import { inspect } from "node:util";

export function redact(value, secrets = []) {
  let text = typeof value === "string" ? value : inspect(value, { depth: 5 });
  for (const secret of secrets)
    if (secret) text = text.replaceAll(secret, "[REDACTED]");
  return text.replace(
    /(api\.telegram\.org\/(?:file\/)?bot)[^/\s]+/g,
    "$1[REDACTED]",
  );
}

export function protectLogs(getSecrets) {
  for (const level of ["log", "warn", "error"]) {
    const original = console[level].bind(console);
    console[level] = (...args) =>
      original(...args.map((value) => redact(value, getSecrets())));
  }
}
