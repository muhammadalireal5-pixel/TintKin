"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, Camera, Sparkles, FileText, Trophy, ShoppingBag, Crown, Lightbulb, MessageSquareHeart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/app/context/AuthContext";
import { getCompanionState } from "@/app/lib/actions";
import { useCompanionPrefs, updateCompanionPrefs, isQuietNow } from "./store";
import { pickMessage, nextTip, dayKeyNow, TOURS, pageGreeting } from "./brain";
import { getPushAskStatus, enablePush } from "./push-client";
import Typewriter, { typingDuration } from "./Typewriter";
import { openFeedback } from "./FeedbackModal";

const SIZE = 104;
const MARGIN = 8;
const TAP_SLOP = 6;
// Kin follows signed-in users everywhere except the admin portal. Onboarding has
// its own inline Kin (it would otherwise sit on top of the questionnaire).
const HIDDEN_PREFIXES = ["/admin", "/onboarding"];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Quick-jump "weapon wheel" that fans out around Kin on tap.
const WHEEL_ITEMS = [
  { id: "scan", label: "Scan", icon: Camera, href: "/capture" },
  { id: "whatif", label: "What-If", icon: Sparkles, href: "/what-if" },
  { id: "reports", label: "Reports", icon: FileText, href: "/reports" },
  { id: "board", label: "Board", icon: Trophy, href: "/leaderboard" },
  { id: "shop", label: "Shop", icon: ShoppingBag, href: "/shop" },
  { id: "plans", label: "Plans", icon: Crown, href: "/pricing" },
  { id: "tip", label: "Tip", icon: Lightbulb, action: "tip" },
  { id: "feedback", label: "Feedback", icon: MessageSquareHeart, action: "feedback" },
];
const WHEEL_RADIUS = 112;
const WHEEL_BTN = 48;

// A true circle of evenly spaced buttons. If Kin is too close to an edge for
// the whole circle to fit, the wheel (and Kin with it) slides inward while open.
function openWheelState(pos) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const top = 72;
  const bottom = h - 92;
  const fitR = Math.min(w / 2 - WHEEL_BTN / 2 - 10, (bottom - top) / 2 - WHEEL_BTN / 2 - 16);
  const R = Math.max(72, Math.min(WHEEL_RADIUS, fitR));
  const half = R + WHEEL_BTN / 2 + 10;
  return {
    R,
    cx: clamp(pos.x + SIZE / 2, half, w - half),
    cy: clamp(pos.y + SIZE / 2, top + half - 8, bottom - half),
  };
}

const wheelOffset = (i, R) => {
  const th = -Math.PI / 2 + (i * 2 * Math.PI) / WHEEL_ITEMS.length;
  return { dx: R * Math.cos(th), dy: R * Math.sin(th) };
};

function visibleTarget(selector) {
  return Array.from(document.querySelectorAll(selector)).find((el) => el.getClientRects().length > 0) || null;
}

function defaultPosition(pathname) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (pathname === "/dashboard") {
    const card = visibleTarget('[data-tour="score"]');
    if (card) {
      const r = card.getBoundingClientRect();
      return { x: clamp(r.right - SIZE - 6, MARGIN, vw - SIZE - MARGIN), y: clamp(r.top - SIZE + 22, 64, vh - SIZE - MARGIN), vw };
    }
  }
  const bottomGap = vw < 768 ? 104 : 28;
  return { x: vw - SIZE - 14, y: vh - SIZE - bottomGap, vw };
}

function fromSaved(p) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: clamp(p.fx * (vw - SIZE), MARGIN, vw - SIZE - MARGIN),
    y: clamp(p.fy * (vh - SIZE), 64, vh - SIZE - MARGIN),
    vw,
  };
}

/**
 * "Kin", the 8-bit cat. A draggable helper that guides the first scan, tours
 * the home screen and nudges about today's scan and routine. Position, tours
 * done and shown reminders are remembered on this device (see ./store).
 */
export default function Companion() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthContext();
  const prefs = useCompanionPrefs();

  const [state, setState] = useState(null);
  const [pushCanAsk, setPushCanAsk] = useState(false);
  const [bubble, setBubble] = useState(null); // { id, text, cta?, tour? }
  const [tour, setTour] = useState(null); // { key, step }
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);

  const lottieBox = useRef(null);
  const animRef = useRef(null);
  const drag = useRef(null);
  const lastTap = useRef(0);
  const [wheel, setWheel] = useState(null); // { R, cx, cy } while the quick-jump wheel is open
  const live = useRef({ tour: null, wheel: null, bubble: null, name: "", prefs });

  const [artFailed, setArtFailed] = useState(false);

  // On phones the scan screen is crowded (camera frame, shutter, nav), so Kin
  // steps aside there once the first-scan walkthrough is out of the way.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const stepAside = narrow && pathname === "/capture" && !tour && (!state || state.hasPlan);

  const visible =
    Boolean(user) && prefs.enabled && !stepAside && !HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  /* ── account snapshot ─────────────────────────────────────────────── */
  const load = useCallback(() => {
    getCompanionState().then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    window.addEventListener("focus", load);
    window.addEventListener("tk-companion-refresh", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("tk-companion-refresh", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [visible, pathname, load]);

  // Offer reminders at most 3 times, at least 4 days apart, only after the
  // first scan, and only where the browser can actually do push.
  const scanned = Boolean(state?.hasPlan);
  useEffect(() => {
    if (!visible || !scanned) return;
    getPushAskStatus().then((s) => setPushCanAsk(s.canAsk));
  }, [visible, scanned]);

  const askState = useMemo(() => {
    if (!state) return state;
    const ask = prefs.pushAsk;
    const gapDays = ask?.last ? (Date.parse(dayKeyNow()) - Date.parse(ask.last)) / 86400000 : Infinity;
    return { ...state, pushAskDue: pushCanAsk && (ask?.count || 0) < 3 && gapDays >= 4 };
  }, [state, pushCanAsk, prefs.pushAsk]);

  /* ── lottie ───────────────────────────────────────────────────────── */
  const play = useCallback(() => {
    animRef.current?.goToAndPlay(0, true);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    let anim = null;
    (async () => {
      try {
        const [{ default: lottie }, data] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetch("/companion/cat.json").then((r) => r.json()),
        ]);
        if (cancelled || !lottieBox.current) return;
        anim = lottie.loadAnimation({
          container: lottieBox.current,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: data,
          // The cat only fills ~60% of the 356x364 canvas; crop the view to it so it reads bigger.
          rendererSettings: { viewBoxSize: "40 85 250 225", preserveAspectRatio: "xMidYMid meet" },
        });
        anim.addEventListener("complete", () => anim.goToAndStop(0, true));
        animRef.current = anim;
        anim.goToAndStop(0, true);
      } catch {
        // Fall back to an emoji so the companion never vanishes.
        if (!cancelled) setArtFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      animRef.current = null;
      anim?.destroy();
    };
  }, [visible]);

  // Occasional idle animation (skipped for reduced motion).
  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = window.setInterval(play, 14000);
    return () => window.clearInterval(id);
  }, [visible, play]);

  /* ── position ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!visible) return undefined;
    // Wait a frame so the page has laid out (the score card anchor exists).
    const raf = requestAnimationFrame(() => {
      setPos((cur) => (prefs.pos ? fromSaved(prefs.pos) : cur && dragging ? cur : defaultPosition(pathname)));
    });
    const onResize = () => setPos((cur) => (prefs.pos ? fromSaved(prefs.pos) : cur ? { x: clamp(cur.x, MARGIN, window.innerWidth - SIZE - MARGIN), y: clamp(cur.y, 64, window.innerHeight - SIZE - MARGIN), vw: window.innerWidth } : cur));
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pathname, prefs.pos]);

  /* ── page greetings and praise ────────────────────────────────────── */
  useEffect(() => {
    live.current = { tour, wheel, bubble, name: state?.firstName || "", prefs };
  });

  // Short transient line; never overrides a reminder, offer or tour in progress.
  const say = useCallback((text, force = false) => {
    const cur = live.current;
    if (cur.tour || cur.wheel) return;
    if (cur.bubble && !(force || cur.bubble.transient)) return;
    setBubble({ id: "say", text, transient: true });
    play();
  }, [play]);

  // Hello: only after a scan, on the home screen (once a day) and in onboarding.
  useEffect(() => {
    if (!visible) return undefined;
    const t = window.setTimeout(() => {
      const cur = live.current;
      if (cur.tour || cur.wheel || cur.bubble) return;
      let justScanned = false;
      try {
        justScanned = window.sessionStorage.getItem("tk:justScanned") === "1";
        if (justScanned) window.sessionStorage.removeItem("tk:justScanned");
      } catch {
        // storage blocked: skip the scan-complete line
      }
      const today = dayKeyNow();
      const greetKey = `greet-${pathname}`;
      if (!justScanned && (isQuietNow(cur.prefs) || cur.prefs.seen?.[greetKey] === today)) return;
      const text = pageGreeting(pathname, { hour: new Date().getHours(), name: cur.name, justScanned });
      if (!text) return;
      say(text);
      updateCompanionPrefs((p) => ({ seen: { ...p.seen, [greetKey]: today } }));
    }, 900);
    return () => window.clearTimeout(t);
  }, [visible, pathname, say]);

  // Kin only speaks up for real actions, sent explicitly through kinSay
  // (routine steps, milestones). Bare clicks on buttons and tabs get no praise.
  useEffect(() => {
    if (!visible) return undefined;
    const onSay = (e) => {
      if (e.detail?.text) say(e.detail.text, true);
    };
    window.addEventListener("tk-kin-say", onSay);
    return () => window.removeEventListener("tk-kin-say", onSay);
  }, [visible, say]);

  /* ── choosing what to say ─────────────────────────────────────────── */
  const show = useCallback((msg) => {
    setBubble(msg);
    play();
    if (!msg.tour) {
      updateCompanionPrefs((p) => ({ seen: { ...p.seen, [msg.id]: dayKeyNow() } }));
    }
    if (msg.id === "push-ask") {
      updateCompanionPrefs((p) => ({ pushAsk: { count: (p.pushAsk?.count || 0) + 1, last: dayKeyNow() } }));
    }
  }, [play]);

  useEffect(() => {
    if (!visible || !state || tour || bubble || wheel) return undefined;
    const timer = window.setTimeout(() => {
      // Unprompted nudges respect quiet hours; the first-scan offer and tours are exempt.
      const quiet = isQuietNow(live.current.prefs);
      const msg = pickMessage({
        state: askState,
        pathname,
        hour: new Date().getHours(),
        seen: prefs.seen,
        tours: prefs.tours,
        today: dayKeyNow(),
      });
      if (msg && (!quiet || msg.tour)) show(msg);
    }, 4000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, state, pathname, tour, bubble, wheel]);

  // Every bubble fades on its own. A tour offer just closes (it is not marked as
  // skipped, so Kin offers again later); only an in-progress tour waits for you.
  useEffect(() => {
    if (!bubble || tour || wheel) return undefined;
    const timer = window.setTimeout(() => setBubble(null), typingDuration(bubble.text) + (bubble.tour ? 20000 : bubble.cta ? 11000 : bubble.transient ? 3500 : 6500));
    return () => window.clearTimeout(timer);
  }, [bubble, tour, wheel]);

  /* ── tours ────────────────────────────────────────────────────────── */
  const finishTour = useCallback((key) => {
    setTour(null);
    setBubble(null);
    updateCompanionPrefs((p) => ({ tours: { ...p.tours, [key]: true } }));
  }, []);

  // A tour belongs to its page: leaving it ends it quietly.
  useEffect(() => {
    if (tour && pathname !== TOURS[tour.key].path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTour(null);
    }
  }, [pathname, tour]);

  // Spotlight the element the current step is talking about.
  useEffect(() => {
    if (!tour) return undefined;
    const step = TOURS[tour.key].steps[tour.step];
    const el = step?.target ? visibleTarget(step.target) : null;
    if (!el) return undefined;
    el.setAttribute("data-tour-active", "true");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => el.removeAttribute("data-tour-active");
  }, [tour]);

  // Tapping anywhere outside a message closes it (tours wait for Next / Done).
  useEffect(() => {
    if (!bubble || tour) return undefined;
    const onDown = (e) => {
      if (!e.target.closest?.("[data-kin-ignore]")) setBubble(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [bubble, tour]);

  /* ── dragging ─────────────────────────────────────────────────────── */
  const onPointerDown = (e) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      setWheel(null);
      setDragging(true);
      play();
    }
    setPos({
      x: clamp(d.ox + dx, MARGIN, window.innerWidth - SIZE - MARGIN),
      y: clamp(d.oy + dy, 64, window.innerHeight - SIZE - MARGIN),
      vw: window.innerWidth,
    });
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      setDragging(false);
      if (pos) {
        updateCompanionPrefs({
          pos: {
            fx: (pos.x) / Math.max(1, window.innerWidth - SIZE),
            fy: (pos.y) / Math.max(1, window.innerHeight - SIZE),
          },
        });
      }
      return;
    }
    // Double tap / double click opens the feedback form.
    const now = e.timeStamp;
    if (now - lastTap.current < 350) {
      lastTap.current = 0;
      setBubble(null);
      setWheel(null);
      openFeedback();
      return;
    }
    lastTap.current = now;
    onTap();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWheel(null);
  }, [pathname]);

  const showTip = () => {
    const msg = state
      ? pickMessage({ state: askState, pathname, hour: new Date().getHours(), seen: prefs.seen, tours: prefs.tours, today: dayKeyNow() })
      : null;
    if (msg) {
      show(msg);
    } else {
      show({ id: "tip", text: nextTip(prefs.tipIndex) });
      updateCompanionPrefs((p) => ({ tipIndex: (p.tipIndex || 0) + 1 }));
    }
  };

  // Tap toggles the quick-jump wheel.
  const onTap = () => {
    if (tour) return;
    setBubble(null);
    setWheel((w) => (w ? null : pos ? openWheelState(pos) : null));
  };

  const chooseWheelItem = (item) => {
    setWheel(null);
    if (item.href) router.push(item.href);
    else if (item.action === "feedback") openFeedback();
    else if (item.action === "tip") showTip();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap();
    } else if (e.key === "Escape") {
      setBubble(null);
      setWheel(null);
    }
  };

  if (!visible || !pos) {
    // Keep the element out of the DOM until placed so it never flashes at 0,0.
    return null;
  }

  const above = pos.y > 190;
  const alignRight = pos.x > pos.vw / 2;
  const step = tour ? TOURS[tour.key].steps[tour.step] : null;
  const isLast = tour ? tour.step >= TOURS[tour.key].steps.length - 1 : false;
  const text = step ? step.text : bubble?.text;

  return (
    <>
    {wheel && (
      <div className="fixed inset-0 z-[54]" onPointerDown={() => setWheel(null)} aria-hidden="true" />
    )}
    <div
      data-kin-ignore
      className="fixed z-[55] select-none"
      style={{
        left: wheel ? wheel.cx - SIZE / 2 : pos.x,
        top: wheel ? wheel.cy - SIZE / 2 : pos.y,
        width: SIZE,
        height: SIZE,
        touchAction: "none",
        transition: dragging ? "none" : "left 0.28s cubic-bezier(0.16,1,0.3,1), top 0.28s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <AnimatePresence>
        {wheel && (
          <motion.div
            key="disc"
            aria-hidden="true"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute rounded-full bg-accent-soft/60 border border-line/80 pointer-events-none"
            style={{
              width: (wheel.R + WHEEL_BTN / 2 + 12) * 2,
              height: (wheel.R + WHEEL_BTN / 2 + 12) * 2,
              left: SIZE / 2 - (wheel.R + WHEEL_BTN / 2 + 12),
              top: SIZE / 2 - (wheel.R + WHEEL_BTN / 2 + 12),
              zIndex: -1,
            }}
          >
            <span
              className="absolute rounded-full border-2 border-dashed border-accent/25"
              style={{ inset: WHEEL_BTN / 2 + 12 }}
            />
          </motion.div>
        )}
        {wheel && WHEEL_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const { dx, dy } = wheelOffset(i, wheel.R);
          return (
            <motion.button
              key={item.id}
              type="button"
              data-kin="wheel"
              onClick={() => chooseWheelItem(item)}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={item.label}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ x: dx, y: dy, scale: 1, opacity: 1 }}
              exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 24, delay: i * 0.025 }}
              className="absolute flex items-center justify-center rounded-full bg-surface text-accent border-2 border-white shadow-[0_8px_18px_-6px_rgb(var(--tk-ink-rgb)/0.45)] hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
              style={{ width: WHEEL_BTN, height: WHEEL_BTN, left: SIZE / 2 - WHEEL_BTN / 2, top: SIZE / 2 - WHEEL_BTN / 2 }}
            >
              <Icon size={21} />
              <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface/95 px-1.5 py-px tk-text-micro font-semibold text-primary shadow-sm pointer-events-none">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {text && !wheel && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute w-[min(17rem,78vw)] rounded-2xl bg-surface border border-line shadow-[0_14px_34px_-12px_rgb(var(--tk-ink-rgb)/0.35)] p-3.5 ${above ? "bottom-full mb-2" : "top-full mt-2"} ${alignRight ? "right-0" : "left-0"}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span
            aria-hidden="true"
            className={`absolute w-3 h-3 rotate-45 bg-surface border-line ${above ? "-bottom-1.5 border-r border-b" : "-top-1.5 border-l border-t"} ${alignRight ? "right-9" : "left-9"}`}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={() => (tour ? finishTour(tour.key) : setBubble(null))}
            className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-primary/70 bg-blush/70 hover:bg-blush hover:text-primary focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} />
          </button>
          <Typewriter key={text} text={text} className="text-sm text-primary leading-snug pr-7" />

          {tour ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="tk-text-micro text-muted tabular-nums">
                {tour.step + 1} / {TOURS[tour.key].steps.length}
              </span>
              <div className="flex gap-1.5">
                {tour.step > 0 && (
                  <button type="button" onClick={() => setTour({ ...tour, step: tour.step - 1 })} className="tk-pill-btn tk-btn-ghost px-3 py-1.5 text-xs">
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (isLast ? finishTour(tour.key) : setTour({ ...tour, step: tour.step + 1 }))}
                  className="tk-pill-btn tk-btn-primary px-3.5 py-1.5 text-xs"
                >
                  {isLast ? "Done" : "Next"}
                </button>
              </div>
            </div>
          ) : bubble?.tour ? (
            <div className="mt-3 flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBubble(null);
                  setTour({ key: bubble.tour, step: 0 });
                }}
                className="tk-pill-btn tk-btn-primary px-3.5 py-1.5 text-xs"
              >
                Show me
              </button>
              <button type="button" onClick={() => finishTour(bubble.tour)} className="tk-pill-btn tk-btn-ghost px-3 py-1.5 text-xs">
                Not now
              </button>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              {bubble?.cta ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (bubble.cta.action === "enable-push") {
                      setBubble(null);
                      const result = await enablePush();
                      setPushCanAsk(false);
                      if (result === "enabled") say("Lovely! I'll send a gentle nudge now and then.", true);
                      else if (result === "denied") {
                        updateCompanionPrefs({ pushAsk: { count: 3, last: dayKeyNow() } });
                        say("No problem. You can turn reminders on in Settings anytime.", true);
                      }
                      return;
                    }
                    router.push(bubble.cta.href);
                    setBubble(null);
                  }}
                  className="tk-pill-btn tk-btn-primary px-3.5 py-1.5 text-xs"
                >
                  {bubble.cta.label}
                </button>
              ) : (
                <span />
              )}
              <span className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBubble(null);
                    updateCompanionPrefs({ enabled: false });
                  }}
                  className="tk-text-micro text-muted underline hover:text-primary"
                  title="You can turn Kin back on in Profile"
                >
                  Hide Kin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBubble(null);
                    openFeedback();
                  }}
                  className="tk-text-micro text-muted underline hover:text-primary"
                >
                  Feedback
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="Kin, your skin companion. Tap to open quick links, double tap to send feedback, drag to move."
        aria-expanded={Boolean(wheel)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`w-full h-full outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl ${dragging ? "cursor-grabbing scale-105" : "cursor-grab"} transition-transform drop-shadow-[0_8px_10px_rgb(var(--tk-ink-rgb)/0.25)]`}
      >
        <div ref={lottieBox} className="w-full h-full pointer-events-none" />
        {artFailed && (
          <span className="absolute inset-0 flex items-center justify-center text-6xl pointer-events-none" aria-hidden="true">🐈‍⬛</span>
        )}
      </div>
    </div>
    </>
  );
}
