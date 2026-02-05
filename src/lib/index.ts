import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { Task, TaskStatus, TaskPriority, Repository } from '@/types'

const REPOS_DIR = path.join(process.cwd(), 'repos')
const VALID_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export function discoverRepositories(): Repository[] {
  const entries = fs.readdirSync(REPOS_DIR, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => ({ name: e.name, path: path.join(REPOS_DIR, e.name) }))
}

function findMdxFiles(dir: string): string[] {
  const results: string[] = []

  function walk(current: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        results.push(full)
      }
    }
  }

  walk(dir)
  return results
}

function parseTaskFile(filePath: string, repoName: string): Task | null {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(raw)

  if (!data.title || !data.status) return null
  if (!VALID_STATUSES.includes(data.status)) return null

  const basename = path.basename(filePath, '.mdx')
  const id = `${repoName}/${basename}`

  return {
    id,
    title: data.title,
    status: data.status as TaskStatus,
    priority: VALID_PRIORITIES.includes(data.priority)
      ? (data.priority as TaskPriority)
      : undefined,
    assignee: typeof data.assignee === 'string' ? data.assignee : undefined,
    repository: repoName,
    filePath,
  }
}

export function loadTasks(): Task[] {
  const repos = discoverRepositories()
  const tasks: Task[] = []

  for (const repo of repos) {
    const tasksDir = path.join(repo.path, '.focal', 'tasks')
    if (!fs.existsSync(tasksDir)) continue

    const mdxFiles = findMdxFiles(tasksDir)
    for (const file of mdxFiles) {
      const task = parseTaskFile(file, repo.name)
      if (task) tasks.push(task)
    }
  }

  return tasks
}
