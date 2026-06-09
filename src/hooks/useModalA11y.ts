"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility behavior for hand-rolled modals:
 * - Escape closes the modal
 * - Tab / Shift+Tab cycle focus inside the panel (focus trap)
 * - Focus moves into the panel on open and back to the trigger on close
 *
 * Usage:
 *   const panelRef = useModalA11y<HTMLFormElement>(open, handleClose);
 *   {open && <form ref={panelRef} role="dialog" aria-modal="true" aria-label="…">}
 */
export function useModalA11y<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const panelRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the panel unless something inside (e.g. autoFocus) already has it
    if (!panel.contains(document.activeElement)) {
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      (focusables[0] ?? panel).focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;

      const first = items[0];
      const last  = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return panelRef;
}
