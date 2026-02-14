import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

export function getBaseExtensions({ collaboration = false } = {}) {
  return [
    StarterKit.configure(collaboration ? { undoRedo: false } : {}),
    Link.configure({ openOnClick: false }),
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
  ];
}
