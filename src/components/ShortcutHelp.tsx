"use client";

import { useState, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcut";

const SECTIONS = [
  {
    title: "Board",
    shortcuts: [
      { keys: ["N"], label: "New task" },
      { keys: ["J", "\u2193"], label: "Move down" },
      { keys: ["K", "\u2191"], label: "Move up" },
      { keys: ["H", "\u2190"], label: "Move left" },
      { keys: ["L", "\u2192"], label: "Move right" },
      { keys: ["\u21B5"], label: "Open task" },
      { keys: ["Esc"], label: "Clear selection" },
    ],
  },
  {
    title: "Task Edit",
    shortcuts: [
      { keys: ["\u2318S"], label: "Save task" },
      { keys: ["Esc"], label: "Back to board" },
    ],
  },
  {
    title: "Docs",
    shortcuts: [
      { keys: ["N"], label: "New document" },
      { keys: ["E"], label: "Edit document" },
      { keys: ["\u2318S"], label: "Save document" },
      { keys: ["Esc"], label: "Cancel editing" },
    ],
  },
  {
    title: "Global",
    shortcuts: [
      { keys: ["["], label: "Toggle sidebar" },
      { keys: ["Ctrl+\u21B5"], label: "Commit changes" },
      { keys: ["?"], label: "Toggle this help" },
    ],
  },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useKeyboardShortcuts(useMemo(() => [{ key: "?", shift: true, handler: toggle }], [toggle]));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative rounded-lg border border-gray-200 bg-white shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Keyboard shortcuts</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">
            Esc
          </button>
        </div>
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{section.title}</h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="inline-flex min-w-[22px] items-center justify-center rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-600"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
