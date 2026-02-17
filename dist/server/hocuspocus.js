"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// DOM polyfill — must be set before importing tiptap
const linkedom_1 = require("linkedom");
const dom = (0, linkedom_1.parseHTML)("<!DOCTYPE html><html><body></body></html>");
// @ts-ignore polyfill for tiptap headless
global.window = dom.window;
// @ts-ignore polyfill for tiptap headless
global.document = dom.document;
const node_fs_1 = __importDefault(require("node:fs"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const server_1 = require("@hocuspocus/server");
const core_1 = require("@tiptap/core");
const model_1 = require("@tiptap/pm/model");
const starter_kit_1 = __importDefault(require("@tiptap/starter-kit"));
const extension_text_align_1 = __importDefault(require("@tiptap/extension-text-align"));
const y_tiptap_1 = require("@tiptap/y-tiptap");
const marked_1 = require("marked");
// Build the same ProseMirror schema as the client editor
const extensions = [starter_kit_1.default, extension_text_align_1.default.configure({ types: ["heading", "paragraph"] })];
const schema = (0, core_1.getSchema)(extensions);
const pmParser = model_1.DOMParser.fromSchema(schema);
const port = parseInt(process.env.HOCUSPOCUS_PORT || "1236", 10);
const server = new server_1.Server({
    port,
    quiet: true,
    async onLoadDocument({ document, documentName }) {
        // documentName is the filePath (or "task:<filePath>" for tasks).
        const fragment = document.getXmlFragment("default");
        if (fragment.length > 0)
            return;
        const isTask = documentName.startsWith("task:");
        const filePath = isTask ? documentName.slice(5) : documentName;
        try {
            const raw = node_fs_1.default.readFileSync(filePath, "utf-8");
            const markdown = isTask ? (0, gray_matter_1.default)(raw).content : raw;
            const html = marked_1.marked.parse(markdown, { async: false });
            // Parse HTML into a DOM, then into a ProseMirror node
            const { document: htmlDoc } = (0, linkedom_1.parseHTML)(html);
            const pmNode = pmParser.parse(htmlDoc);
            // Convert the ProseMirror node into the Yjs document
            const initialDoc = (0, y_tiptap_1.prosemirrorToYDoc)(pmNode, "default");
            const initialUpdate = require("yjs").encodeStateAsUpdate(initialDoc);
            require("yjs").applyUpdate(document, initialUpdate);
            console.log(`[ws] Loaded "${documentName}" (${fragment.length} nodes)`);
        }
        catch (err) {
            console.error(`[ws] Failed to load "${documentName}":`, err.message);
        }
    },
    async onConnect({ documentName }) {
        console.log(`[ws] Client connected to "${documentName}"`);
    },
    async onDisconnect({ documentName }) {
        console.log(`[ws] Client disconnected from "${documentName}"`);
    },
    async onStateless({ payload, document }) {
        document.broadcastStateless(payload);
    },
});
server
    .listen()
    .then(() => {
    console.log(`Hocuspocus server running on port ${port}`);
})
    .catch((err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Kill the existing process or set HOCUSPOCUS_PORT.`);
    }
    else {
        console.error("Failed to start Hocuspocus server:", err);
    }
    process.exit(1);
});
