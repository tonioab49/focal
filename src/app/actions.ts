'use server'

import fs from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import matter from 'gray-matter'
import { revalidatePath } from 'next/cache'
import type { TaskPriority, TaskStatus } from '@/types'

const REPOS_DIR = path.join(process.cwd(), 'repos')

export async function saveTask(formData: {
  filePath: string
  title: string
  status: TaskStatus
  priority: TaskPriority | ''
  assignee: string
}) {
  const { filePath, title, status, priority, assignee } = formData

  // Ensure the file is within the repos directory
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(REPOS_DIR)) {
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
  revalidatePath(`/task`)
}

export async function getUncommittedFiles(): Promise<string[]> {
  const repos = fs.readdirSync(REPOS_DIR, { withFileTypes: true })
  const dirty: string[] = []

  for (const entry of repos) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const repoPath = path.join(REPOS_DIR, entry.name)
    const focalDir = path.join(repoPath, '.focal', 'tasks')
    if (!fs.existsSync(focalDir)) continue

    try {
      const output = execSync('git status --porcelain .focal/tasks/', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim()
      if (output) {
        for (const line of output.split('\n')) {
          // Format: "XY filename" — strip the 3-char prefix
          const file = line.slice(3)
          dirty.push(`${entry.name}/${file}`)
        }
      }
    } catch {
      // Not a git repo or git not available — skip
    }
  }

  return dirty
}

export async function commitChanges(): Promise<{ message: string }> {
  const repos = fs.readdirSync(REPOS_DIR, { withFileTypes: true })
  let committed = 0

  for (const entry of repos) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const repoPath = path.join(REPOS_DIR, entry.name)
    const focalDir = path.join(repoPath, '.focal', 'tasks')
    if (!fs.existsSync(focalDir)) continue

    try {
      const output = execSync('git status --porcelain .focal/tasks/', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim()
      if (!output) continue

      execSync('git add .focal/tasks/', { cwd: repoPath })
      execSync('git commit -m "Update tasks"', { cwd: repoPath })
      committed++
    } catch {
      // skip repos with no changes or git errors
    }
  }

  revalidatePath('/')

  if (committed === 0) return { message: 'No changes to commit' }
  return {
    message: `Committed changes in ${committed} ${committed === 1 ? 'repository' : 'repositories'}`,
  }
}
