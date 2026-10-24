"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kin's 8-bit cat as a small inline avatar (the same artwork as the floating
 * companion). Plays once on mount and again when `nudge` changes; falls back
 * to an emoji if the animation can't load.
 */
export default function KinAvatar({ size = 56, nudge = 0, className = "" }) {
  const box = useRef(null);
  const anim = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ default: lottie }, data] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetch("/companion/cat.json").then((r) => r.json()),
        ]);
        if (cancelled || !box.current) return;
        anim.current = lottie.loadAnimation({
          container: box.current,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData: data,
          rendererSettings: { viewBoxSize: "40 85 250 225", preserveAspectRatio: "xMidYMid meet" },
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      anim.current?.destroy();
      anim.current = null;
    };
  }, []);

  useEffect(() => {
    if (nudge) anim.current?.goToAndPlay(0, true);
  }, [nudge]);

  return (
    <div className={`shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {failed ? <span className="text-3xl leading-none">🐱</span> : <div ref={box} className="w-full h-full" />}
    </div>
  );
}
