"use server";

import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import matter from "gray-matter";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { TaskPriority, TaskStatus } from "@/types";
import { REPOS_DIR, parseRepoSlugs, repoLocalPath, pushRepo, rebaseRepo, isLocalMode, findGitRoot, syncAllRepos } from "@/lib/github";

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
  const sep = path.sep;

  // Validate: must be within allowed root, must be .md/.mdx, must not be in .focal/tasks/
  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR;
  if (!resolved.startsWith(allowedRoot + sep)) {
    throw new Error("Invalid file path");
  }
  if (!resolved.endsWith(".md") && !resolved.endsWith(".mdx")) {
    throw new Error("Invalid file path");
  }
  if (resolved.includes(sep + ".focal" + sep + "tasks" + sep)) {
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
  const isTask = filePath.startsWith(".focal/tasks/") || filePath.includes("/.focal/tasks/");

  if (isTask) {
    const absPath = path.join(repoRoot, filePath);
    if (fs.existsSync(absPath)) {
      try {
        const raw = fs.readFileSync(absPath, "utf-8");
        const { data } = matter(raw);
        if (data.title) return { title: data.title, kind: "task" };
      } catch {
        // fall through to filename-based title
      }
    }
  }

  const basename = path.basename(filePath).replace(/\.\w+$/, "");
  return { title: slugToTitle(basename), kind: isTask ? "task" : "doc" };
}

function parseMdPorcelain(output: string, prefix: string, repoRoot: string): GitFileStatus[] {
  if (!output.trim()) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => ({
      statusChars: line.slice(0, 2),
      filePath: extractFilePath(line),
    }))
    .filter(({ filePath }) => filePath.endsWith(".md") || filePath.endsWith(".mdx"))
    .map(({ statusChars, filePath }) => {
      const { title, kind } = resolveTitle(filePath, repoRoot);
      return {
        path: `${prefix}/${filePath}`,
        title,
        kind,
        status: statusChars.trim() === "??" ? ("new" as const) : ("modified" as const),
      };
    });
}

export async function getGitStatus(repoFilter?: string): Promise<GitStatus> {
  const local = isLocalMode();

  if (local) {
    const gitRoot = findGitRoot();
    const repoName = path.basename(gitRoot);
    try {
      const output = execSync("git status --porcelain", {
        cwd: gitRoot,
        encoding: "utf-8",
      }).trimEnd();
      return {
        localMode: true,
        files: parseMdPorcelain(output, repoName, gitRoot),
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

    try {
      const output = execSync("git status --porcelain", {
        cwd: repoPath,
        encoding: "utf-8",
      }).trimEnd();
      files.push(...parseMdPorcelain(output, slug, repoPath));
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
      const output = execSync("git status --porcelain", {
        cwd: gitRoot,
        encoding: "utf-8",
      }).trimEnd();
      if (!output.trim()) return [];
      return output
        .split("\n")
        .filter(Boolean)
        .map(extractFilePath)
        .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
        .map((file) => `${repoName}/${file}`);
    } catch {
      return [];
    }
  }

  const slugs = parseRepoSlugs();
  const dirty: string[] = [];

  for (const slug of slugs) {
    const repoPath = repoLocalPath(slug);

    try {
      const output = execSync("git status --porcelain", {
        cwd: repoPath,
        encoding: "utf-8",
      }).trimEnd();
      if (output.trim()) {
        for (const line of output.split("\n").filter(Boolean)) {
          const file = extractFilePath(line);
          if (file.endsWith(".md") || file.endsWith(".mdx")) {
            dirty.push(`${slug}/${file}`);
          }
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

export async function createDoc({ title, repoName, parentDir }: { title: string; repoName?: string; parentDir?: string }): Promise<{ slug: string }> {
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

  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR;

  // Determine target directory
  const targetDir = parentDir ? path.resolve(parentDir) : path.join(repoRoot, ".focal", "docs");
  fs.mkdirSync(targetDir, { recursive: true });

  let finalSlug = slug;
  let counter = 2;
  while (fs.existsSync(path.join(targetDir, `${finalSlug}.md`))) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  const filePath = path.join(targetDir, `${finalSlug}.md`);
  const resolved = path.resolve(filePath);

  // Validate the final file path
  if (!resolved.startsWith(allowedRoot + path.sep)) throw new Error("Invalid file path");
  if (!resolved.endsWith(".md") && !resolved.endsWith(".mdx")) throw new Error("Invalid file extension");
  if (resolved.includes(path.sep + ".focal" + path.sep + "tasks" + path.sep)) throw new Error("Cannot create doc in tasks directory");

  fs.writeFileSync(resolved, "", "utf-8");

  // Return slug relative to repo root
  const relPath = path.relative(repoRoot, resolved);
  const slugPath = relPath.replace(/\.(md|mdx)$/, "").replace(/\\/g, "/");

  revalidatePath("/docs");
  return { slug: `${resolvedRepoName}/${slugPath}` };
}

function extractFilePath(line: string): string {
  // git status --porcelain format: XY PATH (always exactly 3 chars: 2 status + 1 space before path)
  // Use slice(3) on the raw line (do NOT trim the line before slicing)
  return line.slice(3);
}

function getChangedMdFiles(output: string): string[] {
  return output
    .split("\n")
    .filter(Boolean)
    .map(extractFilePath)
    .filter((file) => (file.endsWith(".md") || file.endsWith(".mdx")) && !file.startsWith(".focal/tasks/"));
}

export async function commitChanges(repoFilter?: string): Promise<{ message: string }> {
  if (isLocalMode()) {
    const gitRoot = findGitRoot();
    try {
      const output = execSync("git status --porcelain", {
        cwd: gitRoot,
        encoding: "utf-8",
      }).trimEnd();
      if (!output.trim()) {
        return { message: "No changes to commit" };
      }

      // Stage task files
      const tasksDir = path.join(gitRoot, ".focal", "tasks");
      if (fs.existsSync(tasksDir)) {
        execSync("git add -- .focal/tasks/", { cwd: gitRoot });
      }

      // Stage .md/.mdx doc files (not task files)
      const changedDocs = getChangedMdFiles(output);
      for (const file of changedDocs) {
        execSync(`git add -- ${JSON.stringify(file)}`, { cwd: gitRoot });
      }

      // Check if anything was staged
      const staged = execSync("git diff --cached --name-only", { cwd: gitRoot, encoding: "utf-8" }).trim();
      if (!staged) {
        return { message: "No changes to commit" };
      }

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

    try {
      const output = execSync("git status --porcelain", {
        cwd: repoPath,
        encoding: "utf-8",
      }).trimEnd();
      if (!output.trim()) continue;

      // Only process repos with .md/.mdx changes
      const hasMdChanges = output
        .split("\n")
        .filter(Boolean)
        .some((line) => {
          const file = extractFilePath(line);
          return file.endsWith(".md") || file.endsWith(".mdx");
        });
      if (!hasMdChanges) continue;

      // Stage task files
      const tasksDir = path.join(repoPath, ".focal", "tasks");
      if (fs.existsSync(tasksDir)) {
        execSync("git add -- .focal/tasks/", { cwd: repoPath });
      }

      // Stage .md/.mdx doc files (not task files)
      const changedDocs = getChangedMdFiles(output);
      for (const file of changedDocs) {
        execSync(`git add -- ${JSON.stringify(file)}`, { cwd: repoPath });
      }

      // Check if anything was staged
      const staged = execSync("git diff --cached --name-only", { cwd: repoPath, encoding: "utf-8" }).trim();
      if (!staged) continue;

      execSync('git commit -m "Update focal content"', { cwd: repoPath });

      try {
        rebaseRepo(repoPath);
      } catch {
        errors.push(`Rebase failed for ${slug}`);
        continue;
      }

      try {
        pushRepo(repoPath);
      } catch {
        errors.push(`Push failed for ${slug}`);
        continue;
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
