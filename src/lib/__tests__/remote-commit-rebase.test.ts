import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import os from "node:os";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Remote mode commit flow", () => {
  let originDir: string;
  let cloneDest: string;
  let originalEnv: { GITHUB_REPOS?: string; GITHUB_TOKEN?: string };
  const slug = "test-org/test-repo";

  beforeEach(() => {
    originalEnv = {
      GITHUB_REPOS: process.env.GITHUB_REPOS,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    };

    originDir = fs.mkdtempSync(path.join(os.tmpdir(), "focal-origin-"));
    execSync("git init --bare", { cwd: originDir, stdio: "pipe" });

    const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), "focal-seed-"));
    execSync(`git clone ${originDir} work`, { cwd: seedDir, stdio: "pipe" });
    const seedClone = path.join(seedDir, "work");
    execSync('git config user.email "test@test.com"', { cwd: seedClone, stdio: "pipe" });
    execSync('git config user.name "Test"', { cwd: seedClone, stdio: "pipe" });

    const docsDir = path.join(seedClone, ".focal", "docs");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, "readme.md"), "# Readme\n");

    execSync("git add .", { cwd: seedClone, stdio: "pipe" });
    execSync('git commit -m "initial"', { cwd: seedClone, stdio: "pipe" });
    execSync("git push", { cwd: seedClone, stdio: "pipe" });
    fs.rmSync(seedDir, { recursive: true, force: true });

    cloneDest = path.join("/tmp/focal/repos", "test-org", "test-repo");
    if (fs.existsSync(cloneDest)) {
      fs.rmSync(cloneDest, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(cloneDest), { recursive: true });
    execSync(`git clone ${originDir} ${cloneDest}`, { stdio: "pipe" });
    execSync('git config user.email "test@test.com"', { cwd: cloneDest, stdio: "pipe" });
    execSync('git config user.name "Test"', { cwd: cloneDest, stdio: "pipe" });

    process.env.GITHUB_REPOS = slug;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    if (originalEnv.GITHUB_REPOS !== undefined) {
      process.env.GITHUB_REPOS = originalEnv.GITHUB_REPOS;
    } else {
      delete process.env.GITHUB_REPOS;
    }
    if (originalEnv.GITHUB_TOKEN !== undefined) {
      process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN;
    } else {
      delete process.env.GITHUB_TOKEN;
    }

    fs.rmSync(originDir, { recursive: true, force: true });
    if (fs.existsSync(cloneDest)) {
      fs.rmSync(cloneDest, { recursive: true, force: true });
    }
    vi.resetModules();
  });

  it("rebases onto origin before push so non-fast-forward updates still succeed", async () => {
    const upstreamDir = fs.mkdtempSync(path.join(os.tmpdir(), "focal-upstream-"));
    execSync(`git clone ${originDir} upstream`, { cwd: upstreamDir, stdio: "pipe" });
    const upstreamClone = path.join(upstreamDir, "upstream");
    execSync('git config user.email "test@test.com"', { cwd: upstreamClone, stdio: "pipe" });
    execSync('git config user.name "Test"', { cwd: upstreamClone, stdio: "pipe" });
    fs.writeFileSync(path.join(upstreamClone, ".focal", "docs", "upstream.md"), "# Upstream\n");
    execSync("git add .", { cwd: upstreamClone, stdio: "pipe" });
    execSync('git commit -m "upstream change"', { cwd: upstreamClone, stdio: "pipe" });
    execSync("git push", { cwd: upstreamClone, stdio: "pipe" });
    fs.rmSync(upstreamDir, { recursive: true, force: true });

    fs.writeFileSync(path.join(cloneDest, ".focal", "docs", "local.md"), "# Local\n");

    const { commitChanges } = await import("@/app/actions");
    const result = await commitChanges();
    expect(result.message).toBe("Committed and pushed in 1 repository");

    const verifyDir = fs.mkdtempSync(path.join(os.tmpdir(), "focal-verify-"));
    execSync(`git clone ${originDir} verify`, { cwd: verifyDir, stdio: "pipe" });
    const verifyClone = path.join(verifyDir, "verify");
    expect(fs.existsSync(path.join(verifyClone, ".focal", "docs", "upstream.md"))).toBe(true);
    expect(fs.existsSync(path.join(verifyClone, ".focal", "docs", "local.md"))).toBe(true);
    fs.rmSync(verifyDir, { recursive: true, force: true });
  });
});
