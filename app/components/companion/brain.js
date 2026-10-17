// Everything the companion ("Kin") says is hard-coded here: a small rules
// engine over the account snapshot (see getCompanionState) and the time of day.
// No AI calls, so it is instant, free and predictable.

export const dayKeyNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TIPS = [
  "Scan in soft daylight, facing a window, for the most accurate score.",
  "Sunscreen is the single biggest thing you can do for spots and fine lines.",
  "Small steps count. A finished morning routine beats a perfect plan.",
  "Drink some water. Your skin will thank you.",
  "Try the What-If simulator to preview how your routine could change your skin.",
  "Consistency beats intensity. Aim for a scan most days.",
  "Check Today's Focus on your home screen. It points at the metric that needs the most love.",
  "Tick off routine steps as you go. It keeps your streak and your plan honest.",
];

export const nextTip = (i) => TIPS[i % TIPS.length];

function greeting(hour, name) {
  const who = name ? `, ${name}` : "";
  if (hour < 12) return `Good morning${who}! Hello beautiful human.`;
  if (hour < 18) return `Hi${who}! Hello beautiful human.`;
  return `Good evening${who}. Hello beautiful human.`;
}

/**
 * Guided tours, shown step by step. `target` is an optional CSS selector to
 * highlight (elements carry data-tour="..." attributes).
 */
export const TOURS = {
  scan: {
    path: "/capture",
    offer: "Want a 30-second walkthrough of your first scan?",
    steps: [
      { text: "Find soft, natural light. Facing a window works best." },
      { text: "Take off glasses, pull your hair back and keep a relaxed, neutral face." },
      { text: "No filters or heavy makeup, so I can read your real skin." },
      { text: "Hold the phone at eye level, then tap the big round button. I'll do the rest!" },
    ],
  },
  today: {
    path: "/dashboard",
    offer: "Your first scan is in! Want me to show you around?",
    steps: [
      { text: "This is your skin score. The picture is your latest scan.", target: '[data-tour="score"]' },
      { text: "Switch between Today and This week to compare your latest scan with your weekly average.", target: '[data-tour="toggle"]' },
      { text: "Four metrics: wrinkles, firmness, spots and radiance. Green arrows mean you improved since your last scan.", target: '[data-tour="metrics"]' },
      { text: "Today's Focus is the one thing worth your attention right now.", target: '[data-tour="focus"]' },
      { text: "Today's Plan shows your morning and evening routine. Tap a tile to tick steps off.", target: '[data-tour="plan"]' },
      { text: "Use the bottom bar to move around: Routine, Progress and Profile. The round button is for your next scan.", target: '[data-tour="nav"]' },
      { text: "Under Explore you'll find What-If, Reports, the Leaderboard and the Shop. That's the tour. I'll be around!", target: '[data-tour="explore"]' },
    ],
  },
};

/**
 * Pick the most useful message for right now.
 * Returns { id, text, cta?: {label, href}, tour?: key } or null.
 * `seen` maps message id -> day key it last showed, so each reminder shows
 * at most once per day.
 */
export function pickMessage({ state, pathname, hour, seen, tours, today }) {
  if (!state) return null;
  const done = (id) => seen?.[id] === today;
  const name = state.firstName;

  // 1. First-ever scan guidance.
  if (state.scanCount === 0) {
    if (pathname === "/capture") {
      if (!tours?.scan) return { id: "tour-offer-scan", text: TOURS.scan.offer, tour: "scan" };
      return null;
    }
    if (!done("first-scan")) {
      return {
        id: "first-scan",
        text: `${greeting(hour, name)} I'm Kin, your skin buddy. Let's do your very first scan together.`,
        cta: { label: "Start my first scan", href: "/capture" },
      };
    }
    return null;
  }

  // 2. Walkthrough of the results screen right after the first scan.
  if (pathname === "/dashboard" && !tours?.today) {
    return { id: "tour-offer-today", text: TOURS.today.offer, tour: "today" };
  }

  const routinesDone =
    state.am.total + state.pm.total > 0 &&
    state.am.done >= state.am.total &&
    state.pm.done >= state.pm.total;

  // 3. Daily nudges, most important first.
  if (!state.scannedToday && state.streak > 0 && hour >= 17 && !done("streak-risk")) {
    return {
      id: "streak-risk",
      text: `Your ${state.streak}-day streak is on the line! A quick scan keeps it alive.`,
      cta: { label: "Scan now", href: "/capture" },
    };
  }
  if (!state.scannedToday && !done("no-scan")) {
    return {
      id: "no-scan",
      text: `${name ? `Hey ${name}` : "Hey"}, you haven't logged a scan today. Ready for a quick one?`,
      cta: { label: "Scan now", href: "/capture" },
    };
  }
  if (hour < 14 && state.am.total > 0 && state.am.done < state.am.total && !done("am-pending")) {
    const left = state.am.total - state.am.done;
    return {
      id: "am-pending",
      text: `Morning routine time! ${left} ${left === 1 ? "step" : "steps"} left to glow.`,
      cta: { label: "Open routine", href: "/routine?tab=am" },
    };
  }
  if (hour >= 17 && state.pm.total > 0 && state.pm.done < state.pm.total && !done("pm-pending")) {
    const left = state.pm.total - state.pm.done;
    return {
      id: "pm-pending",
      text: `Evening routine is waiting. ${left} ${left === 1 ? "step" : "steps"} to go before bed.`,
      cta: { label: "Open routine", href: "/routine?tab=pm" },
    };
  }
  if (state.reportReady && !done("report-ready")) {
    return {
      id: "report-ready",
      text: "Your skin report is ready to read!",
      cta: { label: "View report", href: "/reports" },
    };
  }
  if (state.scannedToday && routinesDone && !done("all-done")) {
    return { id: "all-done", text: "Scan done and every step ticked. You're glowing today. See you tomorrow!" };
  }
  return null;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PAGE_GREETINGS = {
  "/dashboard": [
    "Welcome home! Here's your skin story for today.",
    "Hi again, gorgeous! Let's see how your skin is doing.",
    "Look who's back! Your day at a glance is ready.",
  ],
  "/routine": [
    "Routine time! Tick each step as you go and I'll cheer you on.",
    "Little steps, big glow. Let's get through today's routine!",
    "Your routine is my favourite page. Let's do this!",
  ],
  "/progress": [
    "Look how far you've come! Progress is made of tiny wins.",
    "Your journey in one place. Proud of you already!",
    "Numbers going the right way? Let's check!",
  ],
  "/profile": [
    "This is your corner. Make it yours!",
    "Settings, plans and more are all here. Tell me if you need anything!",
  ],
  "/capture": [
    "Scan time! Soft light, relaxed face. You've got this.",
    "Ready for your close-up? I'll be right here.",
  ],
  "/what-if": [
    "Ooh, the crystal ball! Let's peek at your skin's future.",
    "What if...? My favourite two words. Try a few combos!",
  ],
  "/reports": [
    "Reports! Your progress, written up nicely just for you.",
    "A little recap of your skin journey. Take your time!",
  ],
  "/leaderboard": [
    "Friendly competition! Remember, your only real rival is yesterday's you.",
    "Let's see who's glowing the brightest today!",
  ],
  "/shop": [
    "Shopping time! Credits unlock extra scans and simulations.",
    "Browse away. I won't tell anyone how many you buy!",
  ],
  "/pricing": [
    "Plans! Pick whatever fits you best. No pressure.",
    "Peeking at the plans? Smart. Compare them below!",
  ],
  "/history": [
    "A look back through your weeks. Nostalgia!",
    "Every week counts. Let's see yours.",
  ],
  "/share": [
    "Show off that glow! Pick a card style and share it.",
    "Your score card is looking good. Share it with a friend!",
  ],
  "/onboarding": [
    "Hi, I'm Kin! A few quick questions and we're ready to glow.",
  ],
  "/privacy": ["Reading the fine print? Respect. Your privacy matters to us."],
  "/terms": ["Reading the fine print? Respect. Ask if anything's unclear."],
};

/** A short, friendly line for arriving on a page; null when there's nothing to say. */
export function pageGreeting(pathname, { hour, name, justScanned } = {}) {
  if (justScanned && pathname === "/dashboard") {
    return pick([
      `Scan complete${name ? `, ${name}` : ""}! Your score is in. Proud of you!`,
      "All done! Look at that glow. Let's see your results.",
    ]);
  }
  if (pathname === "/dashboard") {
    const base = hour < 12 ? "Good morning" : hour < 18 ? "Hi" : "Good evening";
    const who = name ? `, ${name}` : "";
    return pick([`${base}${who}! Hello beautiful human.`, ...PAGE_GREETINGS["/dashboard"]]);
  }
  const key = Object.keys(PAGE_GREETINGS).find((p) => pathname === p || pathname.startsWith(p + "/"));
  return key ? pick(PAGE_GREETINGS[key]) : pick(["Hi again! I'm right here if you need me."]);
}

const PRAISE = {
  button: [
    "Nice one!",
    "Look at you go!",
    "You're on a roll!",
    "Love that for you!",
    "Great job, keep it up!",
    "Smooth moves, gorgeous!",
  ],
  choice: ["Ooh, great pick!", "Good choice!", "Excellent taste!", "Yes! That's the one."],
  toggle: ["Nice switch!", "All set. Love it!", "Done and dusted!"],
};

/** Praise for a generic click; kind is "button", "choice" (tabs, radios) or "toggle". */
export const praiseFor = (kind) => pick(PRAISE[kind] || PRAISE.button);

export const ROUTINE_PRAISE = {
  step: (left) =>
    left > 0
      ? pick([`Step done! ${left} to go.`, `Yes! Only ${left} left.`, `Gorgeous! ${left} more and you're set.`])
      : "That's the last one!",
  am: "Morning routine complete! Your skin says thank you.",
  pm: "Evening routine done. Sweet dreams, gorgeous!",
  all: "Every single step done today. You're unstoppable!",
};
