"use client";

import { useEffect, type RefObject } from "react";

/** Dismiss a popover on outside mousedown or Escape.
    `active` gates the listeners so they only exist while the popover is open. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onClose, active]);
}
