import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Repository } from "@/types";

const SLUG_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const REPOS_DIR = "/tmp/focal/repos";

export { REPOS_DIR };

// Track which repos have already been synced this process lifetime
const syncedRepos = new Set<string>();

export function isLocalMode(): boolean {
  const raw = process.env.GITHUB_REPOS;
  return !raw || raw.trim() === "";
}

export function findGitRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Not inside a git repository");
    }
    dir = parent;
  }
}

export function getLocalRepo(): Repository {
  const gitRoot = findGitRoot();
  return { name: path.basename(gitRoot), path: gitRoot };
}

function getToken(): string | undefined {
  return process.env.GITHUB_TOKEN;
}

function remoteUrl(slug: string): string {
  const token = getToken();
  if (token) {
    return `https://x-access-token:${token}@github.com/${slug}.git`;
  }
  return `https://github.com/${slug}.git`;
}

export function parseRepoSlugs(): string[] {
  const raw = process.env.GITHUB_REPOS;
  if (!raw) {
    return [];
  }
  const slugs = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const valid: string[] = [];
  for (const slug of slugs) {
    if (SLUG_RE.test(slug)) {
      valid.push(slug);
    } else {
      console.warn(`[focal] Ignoring invalid repo slug: ${slug}`);
    }
  }
  return valid;
}

export function repoLocalPath(slug: string): string {
  const [owner, repo] = slug.split("/");
  return path.join(REPOS_DIR, owner, repo);
}

function cloneRepo(slug: string): void {
  const dest = repoLocalPath(slug);
  const parent = path.dirname(dest);
  fs.mkdirSync(parent, { recursive: true });
  execSync(`git clone --depth 1 ${remoteUrl(slug)} ${dest}`, {
    stdio: "pipe",
    timeout: 60_000,
  });
}

function pullRepo(slug: string): void {
  const dest = repoLocalPath(slug);
  try {
    execSync("git fetch origin", {
      cwd: dest,
      stdio: "pipe",
      timeout: 30_000,
    });
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: dest,
      stdio: "pipe",
    })
      .toString()
      .trim();
    execSync(`git reset --hard origin/${branch}`, {
      cwd: dest,
      stdio: "pipe",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not a git repository")) {
      // Corrupted clone — remove and re-clone
      console.warn(`[focal] ${slug} is corrupted, re-cloning`);
      fs.rmSync(dest, { recursive: true, force: true });
      cloneRepo(slug);
    } else {
      console.warn(`[focal] git pull failed for ${slug}: ${msg}`);
    }
  }
}

export function syncRepo(slug: string): void {
  if (syncedRepos.has(slug)) return;

  const dest = repoLocalPath(slug);
  if (fs.existsSync(path.join(dest, ".git"))) {
    pullRepo(slug);
  } else {
    cloneRepo(slug);
  }

  syncedRepos.add(slug);
}

export function syncAllRepos(): Repository[] {
  if (isLocalMode()) {
    try {
      return [getLocalRepo()];
    } catch {
      throw new Error(
        "No GITHUB_REPOS configured and not inside a git repository. " +
          'Set the GITHUB_REPOS environment variable (e.g. "owner/repo") to use remote mode.',
      );
    }
  }

  const slugs = parseRepoSlugs();
  const repos: Repository[] = [];

  for (const slug of slugs) {
    try {
      syncRepo(slug);
      repos.push({ name: slug, path: repoLocalPath(slug) });
    } catch (err) {
      console.warn(`[focal] Failed to sync ${slug}: ${err instanceof Error ? err.message : err}`);
      // If already cloned, still include it for offline access
      const dest = repoLocalPath(slug);
      if (fs.existsSync(path.join(dest, ".git"))) {
        repos.push({ name: slug, path: dest });
      }
    }
  }

  return repos;
}

export function pushRepo(repoPath: string): void {
  execSync("git push", {
    cwd: repoPath,
    stdio: "pipe",
    timeout: 30_000,
  });
}
