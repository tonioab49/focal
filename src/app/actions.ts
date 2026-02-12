'use server'

import fs from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import matter from 'gray-matter'
import { revalidatePath } from 'next/cache'
import type { TaskPriority, TaskStatus } from '@/types'
import {
  REPOS_DIR,
  parseRepoSlugs,
  repoLocalPath,
  pushRepo,
  isLocalMode,
  findGitRoot,
} from '@/lib/github'

export async function saveTask(formData: {
  filePath: string
  title: string
  status: TaskStatus
  priority: TaskPriority | ''
  assignee: string
}) {
  const { filePath, title, status, priority, assignee } = formData

  const resolved = path.resolve(filePath)

  // Validate the path is inside a known repo and inside a .focal/tasks/ subtree
  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR
  if (!resolved.startsWith(allowedRoot + path.sep)) {
    throw new Error('Invalid file path')
  }
  if (!resolved.includes(`${path.sep}.focal${path.sep}tasks${path.sep}`)) {
    throw new Error('Invalid file path')
  }

  const raw = fs.readFileSync(resolved, 'utf-8')
  const { content } = matter(raw)

  const frontmatter: Record<string, string> = { title, status }
  if (priority) frontmatter.priority = priority
  if (assignee) frontmatter.assignee = assignee

  const newContent = matter.stringify(content, frontmatter)
  fs.writeFileSync(resolved, newContent, 'utf-8')

  revalidatePath('/')
  revalidatePath('/task')
}

export async function saveDoc(formData: { filePath: string; content: string }) {
  const { filePath, content } = formData

  const resolved = path.resolve(filePath)

  // Validate the path is inside .focal/docs/ subtree
  const allowedRoot = isLocalMode() ? findGitRoot() : REPOS_DIR
  if (!resolved.startsWith(allowedRoot + path.sep)) {
    throw new Error('Invalid file path')
  }
  if (!resolved.includes(`${path.sep}.focal${path.sep}docs${path.sep}`)) {
    throw new Error('Invalid file path')
  }

  fs.writeFileSync(resolved, content, 'utf-8')

  revalidatePath('/')
  revalidatePath('/docs')
}

export async function getUncommittedFiles(): Promise<string[]> {
  if (isLocalMode()) {
    const gitRoot = findGitRoot()
    const repoName = path.basename(gitRoot)
    try {
      const output = execSync('git status --porcelain .focal/', {
        cwd: gitRoot,
        encoding: 'utf-8',
      }).trim()
      if (!output) return []
      return output.split('\n').map((line) => `${repoName}/${line.slice(3)}`)
    } catch {
      return []
    }
  }

  const slugs = parseRepoSlugs()
  const dirty: string[] = []

  for (const slug of slugs) {
    const repoPath = repoLocalPath(slug)
    const focalDir = path.join(repoPath, '.focal')
    if (!fs.existsSync(focalDir)) continue

    try {
      const output = execSync('git status --porcelain .focal/', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim()
      if (output) {
        for (const line of output.split('\n')) {
          const file = line.slice(3)
          dirty.push(`${slug}/${file}`)
        }
      }
    } catch {
      // Not a git repo or git not available — skip
    }
  }

  return dirty
}

export async function commitChanges(): Promise<{ message: string }> {
  if (isLocalMode()) {
    const gitRoot = findGitRoot()
    try {
      const output = execSync('git status --porcelain .focal/', {
        cwd: gitRoot,
        encoding: 'utf-8',
      }).trim()
      if (!output) {
        return { message: 'No changes to commit' }
      }
      execSync('git add .focal/', { cwd: gitRoot })
      execSync('git commit -m "Update focal content"', { cwd: gitRoot })
      try {
        pushRepo(gitRoot)
      } catch {
        // No remote configured — non-fatal
      }
      revalidatePath('/')
      return { message: 'Committed changes' }
    } catch {
      revalidatePath('/')
      return { message: 'Failed to commit changes' }
    }
  }

  const slugs = parseRepoSlugs()
  let committed = 0
  const errors: string[] = []

  for (const slug of slugs) {
    const repoPath = repoLocalPath(slug)
    const focalDir = path.join(repoPath, '.focal')
    if (!fs.existsSync(focalDir)) continue

    try {
      const output = execSync('git status --porcelain .focal/', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim()
      if (!output) continue

      execSync('git add .focal/', { cwd: repoPath })
      execSync('git commit -m "Update focal content"', { cwd: repoPath })

      try {
        pushRepo(repoPath)
      } catch {
        errors.push(`Push failed for ${slug}`)
      }

      committed++
    } catch {
      // skip repos with no changes or git errors
    }
  }

  revalidatePath('/')

  if (errors.length > 0) {
    return { message: errors.join('; ') }
  }
  if (committed === 0) return { message: 'No changes to commit' }
  return {
    message: `Committed and pushed in ${committed} ${committed === 1 ? 'repository' : 'repositories'}`,
  }
}
