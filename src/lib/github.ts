import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Repository } from "@/types";

const SLUG_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const REPOS_DIR = path.join(process.cwd(), "repos");

export { REPOS_DIR };

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
    console.warn("[focal] GITHUB_REPOS is not set — board will be empty");
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
    execSync("git pull --ff-only", {
      cwd: dest,
      stdio: "pipe",
      timeout: 30_000,
    });
  } catch {
    // pull failed (e.g. diverged) — not fatal, we still have local data
    console.warn(`[focal] git pull failed for ${slug}`);
  }
}

export function syncRepo(slug: string): void {
  const dest = repoLocalPath(slug);
  if (fs.existsSync(path.join(dest, ".git"))) {
    pullRepo(slug);
  } else {
    cloneRepo(slug);
  }
}

export function syncAllRepos(): Repository[] {
  const slugs = parseRepoSlugs();
  const repos: Repository[] = [];

  for (const slug of slugs) {
    try {
      syncRepo(slug);
      repos.push({ name: slug, path: repoLocalPath(slug) });
    } catch (err) {
      console.warn(
        `[focal] Failed to sync ${slug}: ${err instanceof Error ? err.message : err}`
      );
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
