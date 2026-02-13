import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { ShortcutHelp } from '@/components/ShortcutHelp'
import { loadDocTree } from '@/lib/docs'
import { getGitStatus } from './actions'
import './globals.css'

export const metadata: Metadata = {
  title: 'Focal',
  description:
    'File-centric task and documentation manager for software projects',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const docTree = loadDocTree()
  const gitStatus = await getGitStatus()

  return (
    <html lang="en">
      <body>
        <AppShell docTree={docTree} gitStatus={gitStatus}>
          {children}
        </AppShell>
        <ShortcutHelp />
      </body>
    </html>
  )
}
