"use client";

import { useEffect } from "react";

interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: (e: KeyboardEvent) => void;
  /** If true, the shortcut fires even when an input/textarea/select is focused */
  global?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;

      for (const s of shortcuts) {
        if (s.key !== e.key) continue;
        if (s.meta && !e.metaKey) continue;
        if (s.ctrl && !e.ctrlKey) continue;
        if (s.shift && !e.shiftKey) continue;
        if (!s.meta && e.metaKey) continue;
        if (!s.ctrl && e.ctrlKey) continue;

        // Skip non-global shortcuts when inside form fields
        if (inInput && !s.global) continue;

        e.preventDefault();
        s.handler(e);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
