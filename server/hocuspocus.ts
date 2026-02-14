// DOM polyfill — must be set before importing tiptap
import { parseHTML } from 'linkedom'
const dom = parseHTML('<!DOCTYPE html><html><body></body></html>')
// @ts-ignore polyfill for tiptap headless
global.window = dom.window
// @ts-ignore polyfill for tiptap headless
global.document = dom.document

import fs from 'node:fs'
import matter from 'gray-matter'
import { Server } from '@hocuspocus/server'
import { getSchema } from '@tiptap/core'
import { DOMParser as PMDOMParser } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { prosemirrorToYDoc } from '@tiptap/y-tiptap'
import { marked } from 'marked'

// Build the same ProseMirror schema as the client editor
const extensions = [
  StarterKit,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
]
const schema = getSchema(extensions)
const pmParser = PMDOMParser.fromSchema(schema)

const port = parseInt(process.env.HOCUSPOCUS_PORT || '1236', 10)

const server = new Server({
  port,
  quiet: true,

  async onLoadDocument({ document, documentName }) {
    // documentName is the filePath (or "task:<filePath>" for tasks).
    const fragment = document.getXmlFragment('default')
    if (fragment.length > 0) return

    const isTask = documentName.startsWith('task:')
    const filePath = isTask ? documentName.slice(5) : documentName

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const markdown = isTask ? matter(raw).content : raw
      const html = marked.parse(markdown, { async: false }) as string

      // Parse HTML into a DOM, then into a ProseMirror node
      const { document: htmlDoc } = parseHTML(html)
      const pmNode = pmParser.parse(htmlDoc)

      // Convert the ProseMirror node into the Yjs document
      const initialDoc = prosemirrorToYDoc(pmNode, 'default')
      const initialUpdate = require('yjs').encodeStateAsUpdate(initialDoc)
      require('yjs').applyUpdate(document, initialUpdate)

      console.log(`[ws] Loaded "${documentName}" (${fragment.length} nodes)`)
    } catch (err: any) {
      console.error(`[ws] Failed to load "${documentName}":`, err.message)
    }
  },

  async onConnect({ documentName }) {
    console.log(`[ws] Client connected to "${documentName}"`)
  },

  async onDisconnect({ documentName }) {
    console.log(`[ws] Client disconnected from "${documentName}"`)
  },

  async onStateless({ payload, document }) {
    document.broadcastStateless(payload)
  },
})

server.listen().then(() => {
  console.log(`Hocuspocus server running on port ${port}`)
}).catch((err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Kill the existing process or set HOCUSPOCUS_PORT.`)
  } else {
    console.error('Failed to start Hocuspocus server:', err)
  }
  process.exit(1)
})
