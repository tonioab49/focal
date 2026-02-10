import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { ShortcutHelp } from '@/components/ShortcutHelp'
import './globals.css'

export const metadata: Metadata = {
  title: 'Focal',
  description:
    'File-centric task and documentation manager for software projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <ShortcutHelp />
      </body>
    </html>
  )
}
