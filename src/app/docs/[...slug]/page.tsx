import { notFound } from 'next/navigation'
import { findDocBySlug, getDocContent } from '@/lib/docs'
import { DocEditor } from '@/components/DocEditor'

export const dynamic = 'force-dynamic'

export default function DocPage({ params }: { params: { slug: string[] } }) {
  const slug = params.slug.join('/')
  const doc = findDocBySlug(slug)

  if (!doc) notFound()

  const content = getDocContent(doc.filePath)

  return (
    <div className="h-full p-6">
      <DocEditor
        filePath={doc.filePath}
        content={content}
        title={doc.title}
        slug={doc.slug}
      />
    </div>
  )
}
