import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const workspaceRoot = resolve(process.cwd());
const phpPort = process.env.PHP_DEV_PORT || "8001";
const phpHost = process.env.PHP_DEV_HOST || "127.0.0.1";
const viteBin = resolve(workspaceRoot, "node_modules", "vite", "bin", "vite.js");

const phpCandidates = process.platform === "win32"
  ? [
      process.env.PHP_BINARY,
      "C:\\xampp\\php\\php.exe",
      "php",
    ]
  : [
      process.env.PHP_BINARY,
      "php",
    ];

const phpCommand = phpCandidates.find((candidate) => candidate && (candidate === "php" || existsSync(candidate)));

if (!phpCommand) {
  console.error("Could not find a PHP binary for the local API server.");
  process.exit(1);
}

const phpProcess = spawn(
  phpCommand,
  ["-S", `${phpHost}:${phpPort}`, "-t", workspaceRoot],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    windowsHide: true,
  },
);

const viteProcess = spawn(
  process.execPath,
  [viteBin, ...process.argv.slice(2)],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      VITE_API_BASE_URL: "/api",
    },
  },
);

let shuttingDown = false;

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!phpProcess.killed) {
    phpProcess.kill();
  }

  if (!viteProcess.killed) {
    viteProcess.kill();
  }

  process.exit(exitCode);
};

phpProcess.on("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(`Local PHP API server exited with code ${code ?? 1}.`);
    shutdown(code ?? 1);
  }
});

viteProcess.on("exit", (code) => {
  shutdown(code ?? 0);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
