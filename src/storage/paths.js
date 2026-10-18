import fs from "node:fs";
import path from "node:path";

let directory = null;

export function dataFile(filename) {
  return path.join(directory || process.cwd(), filename);
}

export function configureStorage(
  dataDirectory,
  legacyDirectory = process.cwd(),
) {
  const target = path.resolve(dataDirectory);
  fs.mkdirSync(target, { recursive: true, mode: 0o700 });
  for (const filename of ["active_tickets.json", "user_languages.json"]) {
    const source = path.resolve(legacyDirectory, filename);
    const destination = path.join(target, filename);
    if (
      source === destination ||
      fs.existsSync(destination) ||
      !fs.existsSync(source)
    )
      continue;
    // Copiar apenas JSON válido e nunca substituir dados já existentes no volume.
    const content = fs.readFileSync(source, "utf8");
    try {
      JSON.parse(content);
    } catch {
      throw new Error(
        `O arquivo legado ${filename} contém JSON inválido. Corrija antes de migrar.`,
      );
    }
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(destination, 0o600);
  }
  directory = target;
}
