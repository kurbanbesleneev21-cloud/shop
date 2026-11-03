"use client";

import { useEffect, useRef } from "react";

/**
 * Shared modal behaviour for sheets, overlays and dropdowns:
 * Escape closes, body scroll is locked (optional), focus moves into the dialog and is restored on close.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void, opts: { lockScroll?: boolean; focus?: boolean; preferField?: boolean } = {}) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { lockScroll = true, focus = true, preferField = false } = opts;
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";
    if (focus) {
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el || el.contains(document.activeElement)) return;
        const all = Array.from(el.querySelectorAll<HTMLElement>("input:not([type=hidden]), select, textarea, button, [href], [tabindex]:not([tabindex='-1'])"));
        const visible = all.filter((x) => x.offsetParent !== null && !x.hasAttribute("disabled"));
        // first control (usually the close button); a form field only when asked, so the mobile keyboard does not pop up
        const target = (preferField ? visible.find((x) => /^(INPUT|SELECT|TEXTAREA)$/.test(x.tagName)) : undefined) ?? visible[0] ?? el;
        if (target === el && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      if (lockScroll) document.body.style.overflow = prevOverflow;
      if (focus && prevFocus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    };
  }, [open, lockScroll, focus, preferField]);
  return ref;
}
