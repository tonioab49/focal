import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import os from 'node:os'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Remote mode sync', () => {
  let originDir: string
  let cloneDest: string
  let originalEnv: { GITHUB_REPOS?: string; GITHUB_TOKEN?: string }
  const slug = 'test-org/test-repo'

  beforeEach(() => {
    originalEnv = {
      GITHUB_REPOS: process.env.GITHUB_REPOS,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    }

    // Create a bare "origin" repo
    originDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focal-origin-'))
    execSync('git init --bare', { cwd: originDir, stdio: 'pipe' })

    // Create a working copy, add .focal/ content, push to origin
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focal-work-'))
    execSync(`git clone ${originDir} work`, { cwd: workDir, stdio: 'pipe' })
    const workClone = path.join(workDir, 'work')
    execSync('git config user.email "test@test.com"', {
      cwd: workClone,
      stdio: 'pipe',
    })
    execSync('git config user.name "Test"', { cwd: workClone, stdio: 'pipe' })

    const docsDir = path.join(workClone, '.focal', 'docs')
    fs.mkdirSync(docsDir, { recursive: true })
    fs.writeFileSync(
      path.join(docsDir, 'readme.md'),
      '# Readme\n\nOriginal content\n',
    )

    execSync('git add .', { cwd: workClone, stdio: 'pipe' })
    execSync('git commit -m "initial"', { cwd: workClone, stdio: 'pipe' })
    execSync('git push', { cwd: workClone, stdio: 'pipe' })
    fs.rmSync(workDir, { recursive: true, force: true })

    // Clone to the exact path that repoLocalPath returns: /tmp/focal/repos/<owner>/<repo>
    // This way syncRepo will see .git exists and call pullRepo,
    // which uses `git fetch origin` (fetching from whatever origin is configured in the clone).
    cloneDest = path.join('/tmp/focal/repos', 'test-org', 'test-repo')
    if (fs.existsSync(cloneDest)) {
      fs.rmSync(cloneDest, { recursive: true, force: true })
    }
    fs.mkdirSync(path.dirname(cloneDest), { recursive: true })
    execSync(`git clone ${originDir} ${cloneDest}`, { stdio: 'pipe' })

    process.env.GITHUB_REPOS = slug
    delete process.env.GITHUB_TOKEN
  })

  afterEach(() => {
    if (originalEnv.GITHUB_REPOS !== undefined) {
      process.env.GITHUB_REPOS = originalEnv.GITHUB_REPOS
    } else {
      delete process.env.GITHUB_REPOS
    }
    if (originalEnv.GITHUB_TOKEN !== undefined) {
      process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN
    } else {
      delete process.env.GITHUB_TOKEN
    }

    fs.rmSync(originDir, { recursive: true, force: true })
    if (fs.existsSync(cloneDest)) {
      fs.rmSync(cloneDest, { recursive: true, force: true })
    }
    vi.resetModules()
  })

  it('hard resets to match remote on first sync', async () => {
    // Make a local modification that diverges from origin
    const docFile = path.join(cloneDest, '.focal', 'docs', 'readme.md')
    fs.writeFileSync(docFile, '# Readme\n\nStale local edit\n')

    const { syncRepo } = await import('@/lib/github')
    syncRepo(slug)

    // After sync, file should match origin (hard reset wipes local changes)
    const content = fs.readFileSync(docFile, 'utf-8')
    expect(content).toContain('Original content')
    expect(content).not.toContain('Stale local edit')
  })

  it('only syncs once per process — subsequent calls preserve local edits', async () => {
    const docFile = path.join(cloneDest, '.focal', 'docs', 'readme.md')

    // Fresh import — syncedRepos is empty
    const { syncRepo } = await import('@/lib/github')

    // First call: syncs (hard resets to origin)
    syncRepo(slug)
    expect(fs.readFileSync(docFile, 'utf-8')).toContain('Original content')

    // Simulate a UI save
    fs.writeFileSync(docFile, '# Readme\n\nEdited via UI\n')

    // Second call: should be a no-op — edit is preserved
    syncRepo(slug)
    const content = fs.readFileSync(docFile, 'utf-8')
    expect(content).toContain('Edited via UI')
  })
})
