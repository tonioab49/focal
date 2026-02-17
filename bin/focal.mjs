#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(__dirname, "..");
const userCwd = process.cwd();

// Locate the git root of the repo the user ran this from.
function findGitRoot(dir) {
  let current = dir;
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

const repoPath = findGitRoot(userCwd);
if (!repoPath) {
  console.error("Error: not inside a git repository.");
  console.error("Please run `npx github:tonioab49/focal` from within a git repo.");
  process.exit(1);
}

const distDir = join(pkgDir, "dist");
if (!existsSync(distDir)) {
  console.error("Error: dist/ not found. Run `yarn dist` to build the package first.");
  process.exit(1);
}

console.log(`Focal → repo: ${repoPath}`);

const port = process.env.PORT || "3333";
const wsPort = process.env.HOCUSPOCUS_PORT || "1236";

const env = {
  ...process.env,
  PORT: port,
  HOCUSPOCUS_PORT: wsPort,
};

console.log(`\nStarting Focal at http://localhost:${port}\n`);

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code ?? 0), 500).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function startChild(label, args, cwd) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`[focal] ${label} exited (code=${code ?? signal})`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
}

startChild("next", [join(distDir, "server.js")], userCwd);
startChild("hocuspocus", [join(distDir, "server/hocuspocus.js")], userCwd);
