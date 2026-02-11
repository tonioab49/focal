import { redirect } from "next/navigation";
import { loadDocTree, flattenDocTree } from "@/lib/docs";

export const dynamic = "force-dynamic";

export default function DocsIndexPage() {
  const tree = loadDocTree();
  const flat = flattenDocTree(tree);

  if (flat.length > 0) {
    redirect(`/docs/${flat[0].slug}`);
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900">Documentation</h1>
        <p className="mt-2 text-sm text-gray-500">
          No documentation files found. Create <code>.focal/docs/*.md</code>{" "}
          files in your repositories to get started.
        </p>
      </div>
    </div>
  );
}
