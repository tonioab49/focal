import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import os from 'node:os'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Local mode', () => {
  let tmpDir: string
  let cwdSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Create a temp git repo simulating a project with .focal/
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focal-test-'))
    execSync('git init', { cwd: tmpDir, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', {
      cwd: tmpDir,
      stdio: 'pipe',
    })
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' })

    // Create .focal/tasks/ with a task file
    const tasksDir = path.join(tmpDir, '.focal', 'tasks')
    fs.mkdirSync(tasksDir, { recursive: true })
    fs.writeFileSync(
      path.join(tasksDir, 'test-task.mdx'),
      '---\ntitle: Test Task\nstatus: todo\n---\n\nTask body\n',
    )

    // Create .focal/docs/ with a doc
    const docsDir = path.join(tmpDir, '.focal', 'docs')
    fs.mkdirSync(docsDir, { recursive: true })
    fs.writeFileSync(
      path.join(docsDir, 'test-doc.md'),
      '# Test Doc\n\nDoc body\n',
    )

    // Initial commit so git status works
    execSync('git add .', { cwd: tmpDir, stdio: 'pipe' })
    execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' })

    // Enable local mode and point cwd to the temp repo
    delete process.env.GITHUB_REPOS
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
  })

  afterEach(() => {
    cwdSpy.mockRestore()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    vi.resetModules()
  })

  describe('github.ts helpers', () => {
    it('isLocalMode() returns true when GITHUB_REPOS is unset', async () => {
      const { isLocalMode } = await import('@/lib/github')
      expect(isLocalMode()).toBe(true)
    })

    it('isLocalMode() returns false when GITHUB_REPOS is set', async () => {
      process.env.GITHUB_REPOS = 'owner/repo'
      const { isLocalMode } = await import('@/lib/github')
      expect(isLocalMode()).toBe(false)
      delete process.env.GITHUB_REPOS
    })

    it('findGitRoot() returns the temp git root', async () => {
      const { findGitRoot } = await import('@/lib/github')
      // resolve to handle macOS /private/var symlinks
      expect(fs.realpathSync(findGitRoot())).toBe(fs.realpathSync(tmpDir))
    })

    it('findGitRoot() throws when not in a git repo', async () => {
      const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'))
      const { findGitRoot } = await import('@/lib/github')
      expect(() => findGitRoot(nonGitDir)).toThrow('Not inside a git repository')
      fs.rmSync(nonGitDir, { recursive: true, force: true })
    })

    it('getLocalRepo() returns repo named after the directory', async () => {
      const { getLocalRepo } = await import('@/lib/github')
      const repo = getLocalRepo()
      expect(repo.name).toBe(path.basename(tmpDir))
      expect(fs.realpathSync(repo.path)).toBe(fs.realpathSync(tmpDir))
    })

    it('syncAllRepos() returns local repo in local mode', async () => {
      const { syncAllRepos } = await import('@/lib/github')
      const repos = syncAllRepos()
      expect(repos).toHaveLength(1)
      expect(fs.realpathSync(repos[0].path)).toBe(fs.realpathSync(tmpDir))
    })

    it('syncAllRepos() does NOT return /tmp/focal/repos paths in local mode', async () => {
      const { syncAllRepos } = await import('@/lib/github')
      const repos = syncAllRepos()
      for (const repo of repos) {
        expect(repo.path).not.toContain('/tmp/focal/repos')
      }
    })
  })

  describe('loadTasks() in local mode', () => {
    it('loads tasks with filePaths pointing to the local repo, not /tmp', async () => {
      const { loadTasks } = await import('@/lib/index')
      const tasks = loadTasks()
      expect(tasks).toHaveLength(1)
      expect(tasks[0].title).toBe('Test Task')
      expect(tasks[0].filePath).not.toContain('/tmp/focal/repos')
      expect(fs.realpathSync(tasks[0].filePath)).toContain(
        fs.realpathSync(tmpDir),
      )
    })
  })

  describe('saveTask() in local mode', () => {
    it('writes changes to the local file on disk', async () => {
      const { loadTasks } = await import('@/lib/index')
      const { saveTask } = await import('@/app/actions')

      const tasks = loadTasks()
      const task = tasks[0]

      await saveTask({
        filePath: task.filePath,
        title: 'Updated Title',
        status: 'in-progress',
        priority: 'high',
        assignee: 'alice',
      })

      // Read the file directly from the local repo
      const localFile = path.join(tmpDir, '.focal', 'tasks', 'test-task.mdx')
      const content = fs.readFileSync(localFile, 'utf-8')
      expect(content).toContain('title: Updated Title')
      expect(content).toContain('status: in-progress')
      expect(content).toContain('priority: high')
      expect(content).toContain('assignee: alice')
    })

    it('rejects paths outside the local git root', async () => {
      const { saveTask } = await import('@/app/actions')

      await expect(
        saveTask({
          filePath: '/tmp/focal/repos/evil/repo/.focal/tasks/hack.mdx',
          title: 'Hacked',
          status: 'todo',
          priority: '',
          assignee: '',
        }),
      ).rejects.toThrow('Invalid file path')
    })
  })

  describe('saveDoc() in local mode', () => {
    it('writes changes to the local doc file on disk', async () => {
      const { saveDoc } = await import('@/app/actions')
      const docPath = path.join(tmpDir, '.focal', 'docs', 'test-doc.md')

      await saveDoc({
        filePath: docPath,
        content: '# Updated Doc\n\nNew content\n',
      })

      const content = fs.readFileSync(docPath, 'utf-8')
      expect(content).toBe('# Updated Doc\n\nNew content\n')
    })
  })

  describe('getUncommittedFiles() in local mode', () => {
    it('returns empty when no changes exist', async () => {
      const { getUncommittedFiles } = await import('@/app/actions')
      const files = await getUncommittedFiles()
      expect(files).toEqual([])
    })

    it('detects modified files in the local .focal/ directory', async () => {
      // Modify a task file
      const taskFile = path.join(tmpDir, '.focal', 'tasks', 'test-task.mdx')
      fs.writeFileSync(
        taskFile,
        '---\ntitle: Modified Task\nstatus: todo\n---\n\nModified body\n',
      )

      const { getUncommittedFiles } = await import('@/app/actions')
      const files = await getUncommittedFiles()
      expect(files.length).toBeGreaterThan(0)
      expect(files[0]).toMatch(/tasks\/test-task\.mdx$/)
      // Must NOT reference the remote repos dir
      expect(files[0]).not.toContain('/tmp/focal/repos')
    })

    it('prefixes files with the repo name (directory basename)', async () => {
      const taskFile = path.join(tmpDir, '.focal', 'tasks', 'test-task.mdx')
      fs.writeFileSync(taskFile, '---\ntitle: Changed\nstatus: todo\n---\n')

      const { getUncommittedFiles } = await import('@/app/actions')
      const files = await getUncommittedFiles()
      const repoName = path.basename(tmpDir)
      expect(files[0]).toMatch(new RegExp(`^${repoName}/`))
    })
  })

  describe('commitChanges() in local mode', () => {
    it('commits .focal/ changes to the local git repo', async () => {
      // Modify a task
      const taskFile = path.join(tmpDir, '.focal', 'tasks', 'test-task.mdx')
      fs.writeFileSync(
        taskFile,
        '---\ntitle: Committed Task\nstatus: done\n---\n\nDone!\n',
      )

      const { commitChanges } = await import('@/app/actions')
      const result = await commitChanges()
      expect(result.message).toBe('Committed changes')

      // Verify git log shows the commit
      const log = execSync('git log --oneline -1', {
        cwd: tmpDir,
        encoding: 'utf-8',
      }).trim()
      expect(log).toContain('Update focal content')
    })

    it('returns "No changes to commit" when nothing is dirty', async () => {
      const { commitChanges } = await import('@/app/actions')
      const result = await commitChanges()
      expect(result.message).toBe('No changes to commit')
    })
  })
})
