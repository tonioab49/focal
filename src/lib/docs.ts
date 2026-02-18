import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { syncAllRepos } from "./github";

export interface DocNode {
  slug: string;
  title: string;
  filePath: string;
  repository: string;
  children?: DocNode[];
}

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripDocExtension(name: string): string {
  return name.replace(/\.md$/, "");
}

function loadFocalIgnore(repoPath: string): string[] {
  const ignorePath = path.join(repoPath, ".focal", ".focalignore");
  try {
    const content = fs.readFileSync(ignorePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function isPathAllowed(relativePath: string): boolean {
  // Always allow .focal/docs/ files
  if (relativePath.startsWith(".focal/docs/")) return true;
  // Block .focal/tasks/ and any other .focal/ subdirs
  if (relativePath.startsWith(".focal/")) return false;
  // Block any path where a segment starts with '.'
  const segments = relativePath.split("/");
  for (const segment of segments) {
    if (segment.startsWith(".")) return false;
  }
  return true;
}

function isIgnored(relativePath: string, patterns: string[]): boolean {
  const segments = relativePath.split("/");
  for (const pattern of patterns) {
    if (pattern.endsWith("/")) {
      // Directory pattern: matches if any non-last segment equals the dir name
      const dir = pattern.slice(0, -1);
      if (segments.slice(0, -1).includes(dir)) return true;
    } else if (pattern.includes("*")) {
      // Simple wildcard: convert to regex
      const regex = new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");
      if (regex.test(relativePath) || segments.some((seg) => regex.test(seg))) return true;
    } else {
      // Exact match or filename match
      if (relativePath === pattern || segments[segments.length - 1] === pattern) return true;
    }
  }
  return false;
}

function listRepoMdFiles(repoPath: string): string[] {
  const ignorePatterns = loadFocalIgnore(repoPath);
  let combined = "";

  try {
    combined += execSync("git ls-files -- '*.md'", {
      cwd: repoPath,
      encoding: "utf-8",
    });
  } catch {
    // not a git repo or git unavailable
  }

  try {
    combined += execSync("git ls-files --others --exclude-standard -- '*.md'", {
      cwd: repoPath,
      encoding: "utf-8",
    });
  } catch {
    // ignore
  }

  const files = Array.from(new Set(combined.split("\n").filter(Boolean)));
  return files.filter((f) => isPathAllowed(f) && !isIgnored(f, ignorePatterns));
}

function buildDocTreeInner(files: string[], basePath: string, repoName: string, repoPath: string): DocNode[] {
  const rootFiles: string[] = [];
  const subDirs = new Map<string, string[]>();

  for (const file of files) {
    const slashIdx = file.indexOf("/");
    if (slashIdx === -1) {
      rootFiles.push(file);
    } else {
      const dir = file.slice(0, slashIdx);
      const rest = file.slice(slashIdx + 1);
      if (!subDirs.has(dir)) subDirs.set(dir, []);
      subDirs.get(dir)!.push(rest);
    }
  }

  const nodes: DocNode[] = [];

  for (const file of rootFiles) {
    const name = stripDocExtension(file);
    const relPath = basePath ? `${basePath}/${name}` : name;
    nodes.push({
      slug: `${repoName}/${relPath}`,
      title: slugToTitle(name),
      filePath: path.join(repoPath, basePath, file),
      repository: repoName,
    });
  }

  for (const [dir, dirFiles] of Array.from(subDirs)) {
    const dirRelPath = basePath ? `${basePath}/${dir}` : dir;
    const children = buildDocTreeInner(dirFiles, dirRelPath, repoName, repoPath);
    if (children.length > 0) {
      nodes.push({
        slug: `${repoName}/${dirRelPath}`,
        title: slugToTitle(dir),
        filePath: path.join(repoPath, dirRelPath),
        repository: repoName,
        children,
      });
    }
  }

  nodes.sort((a, b) => {
    const aIsDir = !!a.children;
    const bIsDir = !!b.children;
    if (aIsDir !== bIsDir) return aIsDir ? 1 : -1;
    if (a.title.toLowerCase() === "index") return -1;
    if (b.title.toLowerCase() === "index") return 1;
    return a.title.localeCompare(b.title);
  });

  return nodes;
}

export function loadDocTree(repoName?: string): DocNode[] {
  const repos = syncAllRepos();
  const allDocs: DocNode[] = [];

  for (const repo of repos) {
    if (repoName && repo.name !== repoName) continue;
    const files = listRepoMdFiles(repo.path);
    if (files.length === 0) continue;
    const repoDocs = buildDocTreeInner(files, "", repo.name, repo.path);
    allDocs.push(...repoDocs);
  }

  return allDocs;
}

export function flattenDocTree(nodes: DocNode[]): DocNode[] {
  const flat: DocNode[] = [];
  for (const node of nodes) {
    if (node.children) {
      flat.push(...flattenDocTree(node.children));
    } else {
      flat.push(node);
    }
  }
  return flat;
}

export function findDocBySlug(slug: string): DocNode | null {
  const tree = loadDocTree();
  const flat = flattenDocTree(tree);
  return flat.find((d) => d.slug === slug) ?? null;
}

export function getDocContent(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}
