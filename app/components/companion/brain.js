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

// Tips are shuffled once per day (seeded by the date) so tapping "Tip" never
// walks the same fixed order.
export const nextTip = (i, day = dayKeyNow()) => {
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const order = TIPS.map((_, n) => n);
  for (let n = order.length - 1; n > 0; n--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (n + 1);
    [order[n], order[j]] = [order[j], order[n]];
  }
  return TIPS[order[i % order.length]];
};

// Kin may volunteer at most this many reminders per day.
export const DAILY_REMINDER_CAP = 2;
export const remindersToday = (seen, today) =>
  Object.entries(seen || {}).filter(([id, day]) => day === today && id !== "tip" && id !== "say" && !id.startsWith("tour-") && !id.startsWith("greet-")).length;

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

  // 3. Daily nudges, most important first. Capped so Kin never nags.
  if (remindersToday(seen, today) >= DAILY_REMINDER_CAP) return null;
  if (!state.activeToday && state.streak > 0 && hour >= 17 && !done("streak-risk")) {
    return {
      id: "streak-risk",
      text: `Want a quick scan or a routine step today? Your ${state.streak}-day streak will thank you.`,
      cta: { label: "Scan now", href: "/capture" },
    };
  }
  if (!state.activeToday && state.streak === 0 && state.longestStreak >= 3 && !done("welcome-back")) {
    return {
      id: "welcome-back",
      text: `Welcome back${name ? `, ${name}` : ""}! Your longest run so far is ${state.longestStreak} days. Ready to start a fresh one?`,
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
    "Showing up is what counts here. Remember, your only real rival is yesterday's you.",
    "Let's see who's been showing up this month!",
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

/**
 * A short line for arriving on a page. Kin only greets on the home screen and
 * onboarding (and after a scan); everywhere else it stays quiet.
 */
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
  if (pathname === "/onboarding") return PAGE_GREETINGS["/onboarding"][0];
  return null;
}

// Kin only celebrates real actions: a routine step, a finished routine, a
// milestone. Never a bare click on a button, tab or toggle.
export const ROUTINE_PRAISE = {
  step: (left) =>
    left > 0
      ? pick([`Step done! ${left} to go.`, `Yes! Only ${left} left.`, `Gorgeous! ${left} more and you're set.`])
      : "That's the last one!",
  get am() {
    return pick([
      "Morning routine complete! Your skin says thank you.",
      "Morning done. A calm start for your skin.",
      "Every morning step ticked. Lovely.",
    ]);
  },
  get pm() {
    return pick([
      "Evening routine done. Sweet dreams, gorgeous!",
      "Evening wrapped up. Your skin will recover well tonight.",
      "All evening steps done. Rest well!",
    ]);
  },
  get all() {
    return pick([
      "Every single step done today. You're unstoppable!",
      "Morning and evening both done. That's real care.",
      "A full routine day. Quietly impressive.",
    ]);
  },
};

/** One warm line when a milestone unlocks, then Kin goes quiet about it. */
export const milestoneLine = (title) =>
  pick([`New milestone: ${title}. Well earned!`, `${title}. That one's yours now.`, `You reached "${title}". Proud of you!`]);
