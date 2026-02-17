#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { existsSync, cpSync, mkdtempSync, symlinkSync, rmSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);

function resolveBin(pkgName, binName) {
  const pkgJson = require(`${pkgName}/package.json`);
  const rel = typeof pkgJson.bin === "string" ? pkgJson.bin : pkgJson.bin[binName];
  return join(dirname(require.resolve(`${pkgName}/package.json`)), rel);
}

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

console.log(`Focal → repo: ${repoPath}`);

const nextBin = resolveBin("next", "next");
const tsxBin = resolveBin("tsx", "tsx");

// Build Next.js app on first run (cached in npx store afterwards).
if (!existsSync(join(pkgDir, ".next"))) {
  console.log("Building Focal (first run — this takes about a minute)…");

  // When pkgDir is inside .npm/_npx/.../node_modules/focal/, webpack treats source files
  // as node_modules and skips TypeScript compilation. Build in a temp dir outside
  // node_modules so SWC compiles TypeScript properly, then cache .next/ back in pkgDir.
  const buildTmp = mkdtempSync(join(tmpdir(), "focal-build-"));
  try {
    // Copy source files — skip node_modules, .next, repos
    cpSync(pkgDir, buildTmp, {
      recursive: true,
      filter: (src) => {
        const rel = relative(pkgDir, src);
        if (rel === "") return true;
        const top = rel.split(sep)[0];
        return top !== "node_modules" && top !== ".next" && top !== "repos";
      },
    });

    // Symlink the flat npx node_modules store so Next.js can resolve dependencies
    symlinkSync(dirname(pkgDir), join(buildTmp, "node_modules"));

    execFileSync(nextBin, ["build"], { cwd: buildTmp, stdio: "inherit" });

    // Cache the build output back into pkgDir for future runs
    cpSync(join(buildTmp, ".next"), join(pkgDir, ".next"), { recursive: true });
  } finally {
    rmSync(buildTmp, { recursive: true, force: true });
  }
}

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

function startChild(label, bin, args, cwd) {
  const child = spawn(bin, args, { cwd, env, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`[focal] ${label} exited (code=${code ?? signal})`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
}

// next start --dir pkgDir: finds .next/ in pkgDir, but process.cwd() stays as
// userCwd so that findGitRoot() inside the server resolves the user's repo.
startChild("next", nextBin, ["start", "--dir", pkgDir, "-p", port], userCwd);
startChild("hocuspocus", tsxBin, [join(pkgDir, "server/hocuspocus.ts")], userCwd);
