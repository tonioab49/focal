import fs from "node:fs";
import path from "node:path";
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

function isDocFile(name: string): boolean {
  return name.endsWith(".md") || name.endsWith(".mdx");
}

function stripDocExtension(name: string): string {
  return name.replace(/\.(md|mdx)$/, "");
}

function scanDocsDir(dir: string, repoName: string, basePath: string = ""): DocNode[] {
  const nodes: DocNode[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return nodes;
  }

  // Sort entries: index first, then alphabetically
  entries.sort((a, b) => {
    if (a.name.startsWith("index.")) return -1;
    if (b.name.startsWith("index.")) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const slug = basePath ? `${basePath}/${entry.name}` : entry.name;
      const children = scanDocsDir(fullPath, repoName, slug);
      if (children.length > 0) {
        nodes.push({
          slug: `${repoName}/${slug}`,
          title: slugToTitle(entry.name),
          filePath: fullPath,
          repository: repoName,
          children,
        });
      }
    } else if (isDocFile(entry.name)) {
      const name = stripDocExtension(entry.name);
      const slug = basePath ? `${basePath}/${name}` : name;
      nodes.push({
        slug: `${repoName}/${slug}`,
        title: slugToTitle(name),
        filePath: fullPath,
        repository: repoName,
      });
    }
  }

  return nodes;
}

export function loadDocTree(repoName?: string): DocNode[] {
  const repos = syncAllRepos();
  const allDocs: DocNode[] = [];

  for (const repo of repos) {
    if (repoName && repo.name !== repoName) continue;
    const docsDir = path.join(repo.path, ".focal", "docs");
    if (!fs.existsSync(docsDir)) continue;

    const repoDocs = scanDocsDir(docsDir, repo.name);
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
