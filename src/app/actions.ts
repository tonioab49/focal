"use server";

import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import matter from "gray-matter";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { TaskPriority, TaskStatus } from "@/types";
import { REPOS_DIR, parseRepoSlugs, repoLocalPath, pushRepo, isLocalMode, findGitRoot, syncAllRepos } from "@/lib/github";

const REPO_COOKIE = "focal-repo";

export async function setSelectedRepo(repo: string) {
  const cookieStore = await cookies();
  cookieStore.set(REPO_COOKIE, repo, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
}

export async function getSelectedRepo(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REPO_COOKIE)?.value;
}

export async function getRepoList(): Promise<string[]> {
  const repos = syncAllRepos();
  return repos.map((r) => r.name);
}

export async function saveTask(formData: {
  filePath: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority | "";
  assignee: string;
  body?: string;
}) {
  const { filePath, title, status, priority, assignee, body } = formData;

  const resolved = path.resolve(filePath);

  // Validate the path is inside a known repo and inside a .focal/tasks/ subtree
  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR;
  if (!resolved.startsWith(allowedRoot + path.sep)) {
    throw new Error("Invalid file path");
  }
  if (!resolved.includes(`${path.sep}.focal${path.sep}tasks${path.sep}`)) {
    throw new Error("Invalid file path");
  }

  const raw = fs.readFileSync(resolved, "utf-8");
  const { content: existingContent } = matter(raw);

  const frontmatter: Record<string, string> = { title, status };
  if (priority) frontmatter.priority = priority;
  if (assignee) frontmatter.assignee = assignee;

  const contentToWrite = body !== undefined ? body : existingContent;
  const newContent = matter.stringify(contentToWrite, frontmatter);
  fs.writeFileSync(resolved, newContent, "utf-8");

  revalidatePath("/");
  revalidatePath("/task");
}

export async function saveDoc(formData: { filePath: string; content: string }) {
  const { filePath, content } = formData;

  const resolved = path.resolve(filePath);

  // Validate the path is inside .focal/docs/ subtree
  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR;
  if (!resolved.startsWith(allowedRoot + path.sep)) {
    throw new Error("Invalid file path");
  }
  if (!resolved.includes(`${path.sep}.focal${path.sep}docs${path.sep}`)) {
    throw new Error("Invalid file path");
  }

  fs.writeFileSync(resolved, content, "utf-8");

  revalidatePath("/");
  revalidatePath("/docs");
}

export type GitFileStatus = {
  path: string;
  title: string;
  kind: "task" | "doc";
  status: "new" | "modified";
};
export type GitStatus = { localMode: boolean; files: GitFileStatus[] };

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveTitle(filePath: string, repoRoot: string): { title: string; kind: "task" | "doc" } {
  const relPath = filePath.replace(/^\.focal\//, "");
  const isTask = relPath.startsWith("tasks/");

  const absPath = path.join(repoRoot, filePath);
  if (isTask && fs.existsSync(absPath)) {
    try {
      const raw = fs.readFileSync(absPath, "utf-8");
      const { data } = matter(raw);
      if (data.title) return { title: data.title, kind: "task" };
    } catch {
      // fall through to filename-based title
    }
  }

  // Docs (and fallback): derive title from filename like the sidebar does
  const basename = path.basename(filePath).replace(/\.\w+$/, "");
  return { title: slugToTitle(basename), kind: isTask ? "task" : "doc" };
}

function extractPorcelainFile(line: string): string | null {
  // git status --porcelain format: XY<space>PATH (3 chars then path)
  // Extract the .focal/ path regardless of prefix length to handle
  // both staged (M ) and unstaged ( M) statuses reliably.
  const idx = line.indexOf(".focal/");
  if (idx === -1) return null;
  return line.slice(idx);
}

function parseGitPorcelain(output: string, prefix: string, repoRoot: string): GitFileStatus[] {
  if (!output) return [];
  return output
    .split("\n")
    .filter((line) => {
      const file = extractPorcelainFile(line);
      return file !== null && (file.startsWith(".focal/docs/") || file.startsWith(".focal/tasks/"));
    })
    .map((line) => {
      const file = extractPorcelainFile(line)!;
      const { title, kind } = resolveTitle(file, repoRoot);
      return {
        path: `${prefix}/${file}`,
        title,
        kind,
        status: line.startsWith("??") ? ("new" as const) : ("modified" as const),
      };
    });
}

export async function getGitStatus(repoFilter?: string): Promise<GitStatus> {
  const local = isLocalMode();

  if (local) {
    const gitRoot = findGitRoot();
    const repoName = path.basename(gitRoot);
    try {
      const output = execSync("git status --porcelain .focal/", {
        cwd: gitRoot,
        encoding: "utf-8",
      }).trim();
      return {
        localMode: true,
        files: parseGitPorcelain(output, repoName, gitRoot),
      };
    } catch {
      return { localMode: true, files: [] };
    }
  }

  const slugs = parseRepoSlugs();
  const files: GitFileStatus[] = [];

  for (const slug of slugs) {
    if (repoFilter && slug !== repoFilter) continue;
    const repoPath = repoLocalPath(slug);
    const focalDir = path.join(repoPath, ".focal");
    if (!fs.existsSync(focalDir)) continue;

    try {
      const output = execSync("git status --porcelain .focal/", {
        cwd: repoPath,
        encoding: "utf-8",
      }).trim();
      files.push(...parseGitPorcelain(output, slug, repoPath));
    } catch {
      // Not a git repo or git not available — skip
    }
  }

  return { localMode: false, files };
}

export async function getUncommittedFiles(): Promise<string[]> {
  if (isLocalMode()) {
    const gitRoot = findGitRoot();
    const repoName = path.basename(gitRoot);
    try {
      const output = execSync("git status --porcelain .focal/", {
        cwd: gitRoot,
        encoding: "utf-8",
      }).trim();
      if (!output) return [];
      return output.split("\n").map((line) => `${repoName}/${line.slice(3)}`);
    } catch {
      return [];
    }
  }

  const slugs = parseRepoSlugs();
  const dirty: string[] = [];

  for (const slug of slugs) {
    const repoPath = repoLocalPath(slug);
    const focalDir = path.join(repoPath, ".focal");
    if (!fs.existsSync(focalDir)) continue;

    try {
      const output = execSync("git status --porcelain .focal/", {
        cwd: repoPath,
        encoding: "utf-8",
      }).trim();
      if (output) {
        for (const line of output.split("\n")) {
          const file = line.slice(3);
          dirty.push(`${slug}/${file}`);
        }
      }
    } catch {
      // Not a git repo or git not available — skip
    }
  }

  return dirty;
}

export async function createTask({ title, repoName }: { title: string; repoName?: string }): Promise<{ taskId: string }> {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let repoRoot: string;
  let resolvedRepoName: string;
  if (isLocalMode()) {
    repoRoot = findGitRoot();
    resolvedRepoName = path.basename(repoRoot);
  } else {
    if (!repoName) throw new Error("repoName required in multi-repo mode");
    repoRoot = repoLocalPath(repoName);
    resolvedRepoName = repoName;
  }

  const tasksDir = path.join(repoRoot, ".focal", "tasks");
  fs.mkdirSync(tasksDir, { recursive: true });

  let finalSlug = slug;
  let counter = 2;
  while (fs.existsSync(path.join(tasksDir, `${finalSlug}.mdx`))) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  const filePath = path.join(tasksDir, `${finalSlug}.mdx`);
  const resolved = path.resolve(filePath);

  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR;
  if (!resolved.startsWith(allowedRoot + path.sep)) throw new Error("Invalid file path");
  if (!resolved.includes(`${path.sep}.focal${path.sep}tasks${path.sep}`)) throw new Error("Invalid file path");

  const content = matter.stringify("", { title, status: "todo" });
  fs.writeFileSync(resolved, content, "utf-8");

  revalidatePath("/");
  return { taskId: `${resolvedRepoName}/${finalSlug}` };
}

export async function createDoc({ title, repoName }: { title: string; repoName?: string }): Promise<{ slug: string }> {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let repoRoot: string;
  let resolvedRepoName: string;
  if (isLocalMode()) {
    repoRoot = findGitRoot();
    resolvedRepoName = path.basename(repoRoot);
  } else {
    if (!repoName) throw new Error("repoName required in multi-repo mode");
    repoRoot = repoLocalPath(repoName);
    resolvedRepoName = repoName;
  }

  const docsDir = path.join(repoRoot, ".focal", "docs");
  fs.mkdirSync(docsDir, { recursive: true });

  let finalSlug = slug;
  let counter = 2;
  while (fs.existsSync(path.join(docsDir, `${finalSlug}.md`))) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  const filePath = path.join(docsDir, `${finalSlug}.md`);
  const resolved = path.resolve(filePath);

  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR;
  if (!resolved.startsWith(allowedRoot + path.sep)) throw new Error("Invalid file path");
  if (!resolved.includes(`${path.sep}.focal${path.sep}docs${path.sep}`)) throw new Error("Invalid file path");

  fs.writeFileSync(resolved, "", "utf-8");

  revalidatePath("/docs");
  return { slug: `${resolvedRepoName}/${finalSlug}` };
}

export async function commitChanges(repoFilter?: string): Promise<{ message: string }> {
  if (isLocalMode()) {
    const gitRoot = findGitRoot();
    try {
      const output = execSync("git status --porcelain .focal/", {
        cwd: gitRoot,
        encoding: "utf-8",
      }).trim();
      if (!output) {
        return { message: "No changes to commit" };
      }
      execSync("git add .focal/", { cwd: gitRoot });
      execSync('git commit -m "Update focal content"', { cwd: gitRoot });
      try {
        pushRepo(gitRoot);
      } catch {
        // No remote configured — non-fatal
      }
      revalidatePath("/");
      return { message: "Committed changes" };
    } catch {
      revalidatePath("/");
      return { message: "Failed to commit changes" };
    }
  }

  const slugs = parseRepoSlugs();
  let committed = 0;
  const errors: string[] = [];

  for (const slug of slugs) {
    if (repoFilter && slug !== repoFilter) continue;
    const repoPath = repoLocalPath(slug);
    const focalDir = path.join(repoPath, ".focal");
    if (!fs.existsSync(focalDir)) continue;

    try {
      const output = execSync("git status --porcelain .focal/", {
        cwd: repoPath,
        encoding: "utf-8",
      }).trim();
      if (!output) continue;

      execSync("git add .focal/", { cwd: repoPath });
      execSync('git commit -m "Update focal content"', { cwd: repoPath });

      try {
        pushRepo(repoPath);
      } catch {
        errors.push(`Push failed for ${slug}`);
      }

      committed++;
    } catch {
      // skip repos with no changes or git errors
    }
  }

  revalidatePath("/");

  if (errors.length > 0) {
    return { message: errors.join("; ") };
  }
  if (committed === 0) return { message: "No changes to commit" };
  return {
    message: `Committed and pushed in ${committed} ${committed === 1 ? "repository" : "repositories"}`,
  };
}
