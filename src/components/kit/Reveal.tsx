"use client";

import { useEffect, useRef } from "react";

/* ---------- scroll reveal ----------
   One shared rAF-throttled controller instead of a per-element
   IntersectionObserver: an element crossing the whole viewport between
   observer samples (fast scroll / anchor jump) would never fire isIntersecting
   and stay hidden forever. This reveals anything at or above the viewport, so
   content can never get stranded invisible. */

const revealEls = new Set<HTMLElement>();
let revealScheduled = false;

function flushReveals() {
  revealScheduled = false;
  const vh = window.innerHeight;
  revealEls.forEach((el) => {
    if (el.getBoundingClientRect().top < vh * 0.92) {
      el.classList.add("in");
      revealEls.delete(el);
    }
  });
}
function scheduleReveals() {
  if (revealScheduled) return;
  revealScheduled = true;
  requestAnimationFrame(flushReveals);
}
function registerReveal(el: HTMLElement) {
  revealEls.add(el);
  if (revealEls.size === 1) {
    window.addEventListener("scroll", scheduleReveals, { passive: true });
    window.addEventListener("resize", scheduleReveals, { passive: true });
  }
  scheduleReveals();
  return () => {
    revealEls.delete(el);
    if (revealEls.size === 0) {
      window.removeEventListener("scroll", scheduleReveals);
      window.removeEventListener("resize", scheduleReveals);
    }
  };
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  from = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** entry direction — "up" (default), "left", or "right" */
  from?: "up" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transitionDelay = `${delay}ms`;
    return registerReveal(el);
  }, [delay]);
  const dir = from === "left" ? " reveal-left" : from === "right" ? " reveal-right" : "";
  return (
    <div ref={ref} className={`reveal${dir} ${className}`}>
      {children}
    </div>
  );
}
