// oxlint-disable no-inline-comments
// @ts-check
import chalk from "chalk";
import { watch } from "chokidar";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "src");

/** @returns {Promise<void>} */
function runBuild() {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", ["build.js"], { cwd: __dirname, stdio: "inherit" });
    // @ts-expect-error
    proc.on("close", code => (code === 0 ? resolve() : reject(new Error(`Build failed: ${code}`))));
  });
}

/** @returns {Promise<void>} */
async function dev() {
  console.log(chalk.magenta("Starting dev server...\n"));
  await runBuild();

  const liveServer = spawn("npx", ["live-server", "dist", "--port=3000", "--open=/index.html"], {
    cwd: __dirname,
    stdio: "inherit",
  });

  console.log(chalk.yellow("\nWatching for changes..."));
  watch(srcDir, { ignoreInitial: true }).on("all", async (/** @type {string} */ event, /** @type {string} */ path) => {
    console.log(chalk.blue(`\n${event}:`) + " " + chalk.gray(path));
    await runBuild();
  });

  process.on("SIGINT", () => {
    liveServer.kill();
    console.log(chalk.magenta("\nDev server stopped."));
    process.exit(0);
  });
}

try {
  await dev();
} catch (err) {
  console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
  process.exit(1);
}
