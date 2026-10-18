import { start } from "./src/app.js";

try {
  await start();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
