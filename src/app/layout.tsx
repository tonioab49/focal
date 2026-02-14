import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { loadDocTree } from "@/lib/docs";
import { getGitStatus, getSelectedRepo, getRepoList } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focal",
  description: "File-centric task and documentation manager for software projects",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const repos = await getRepoList();
  const selectedRepo = await getSelectedRepo();
  // Use cookie value if valid, otherwise default to first repo
  const activeRepo = selectedRepo && repos.includes(selectedRepo) ? selectedRepo : repos[0];

  const docTree = loadDocTree(activeRepo);
  const gitStatus = await getGitStatus(activeRepo);

  return (
    <html lang="en">
      <body>
        <AppShell docTree={docTree} gitStatus={gitStatus} repos={repos} selectedRepo={activeRepo}>
          {children}
        </AppShell>
        <ShortcutHelp />
      </body>
    </html>
  );
}
