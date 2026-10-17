"use client";

import { useEffect, useState } from "react";

const SPEED_MS = 24;

export const typingDuration = (text) => text.length * SPEED_MS;

/**
 * Types `text` out one character at a time. The full text is rendered
 * invisibly underneath so the bubble keeps its final size (no jumping), and a
 * screen-reader copy is always complete. Give it key={text} so a new message
 * restarts the animation. Reduced-motion users get the text instantly.
 */
export default function Typewriter({ text, className = "" }) {
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text.length : 0
  );

  useEffect(() => {
    if (count >= text.length) return undefined;
    const id = window.setInterval(() => {
      setCount((c) => Math.min(text.length, c + 1));
    }, SPEED_MS);
    return () => window.clearInterval(id);
  }, [count >= text.length, text]); // eslint-disable-line react-hooks/exhaustive-deps

  const typing = count < text.length;
  return (
    <span className={`relative block ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="invisible block">{text}</span>
      <span aria-hidden="true" className="absolute inset-0">
        {text.slice(0, count)}
        {typing && <span className="inline-block w-[2px] h-[1em] -mb-[2px] ml-px bg-accent animate-pulse" />}
      </span>
    </span>
  );
}
