// Everything the companion ("Kin") says is hard-coded here: a small rules
// engine over the account snapshot (see getCompanionState) and the time of day.
// No AI calls, so it is instant, free and predictable.

export const dayKeyNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TIPS = [
  "Scan in soft daylight, facing a window, so your check-ins are comparable.",
  "Sunscreen is the single biggest thing you can do for spots and fine lines.",
  "Small steps count. A finished morning routine beats a perfect plan.",
  "Drink some water. Your skin will thank you.",
  "Try the What-If simulator to preview how your routine could change your skin.",
  "Skin changes slowly. One check-in scan a week, in the same light, shows your progress best.",
  "Your plan has two focus areas. Watch those bars on your home screen move over the next 30 days.",
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
    offer: "Your plan is ready! Want me to show you around?",
    steps: [
      { text: "This is your plan: the day you're on, today's steps and how your two focus areas are moving.", target: '[data-tour="plan-card"]' },
      { text: "Today's Plan shows your morning and evening routine. Tap a tile to tick steps off.", target: '[data-tour="plan"]' },
      { text: "Use the bottom bar to move around: Plan, Progress and Profile. The round button is for optional progress scans.", target: '[data-tour="nav"]' },
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

  // The first-scan welcome walks them through it on its own.
  if (pathname === "/welcome") return null;

  // 1. No plan yet: the plan comes first, and it needs no scan.
  if (!state.hasPlan) {
    if (pathname === "/capture") {
      if (!tours?.scan) return { id: "tour-offer-scan", text: TOURS.scan.offer, tour: "scan" };
      return null;
    }
    if (!done("first-plan")) {
      return {
        id: "first-plan",
        text: `${greeting(hour, name)} I'm Kin, your skin buddy. Let's build your 30-day plan.`,
        cta: { label: "Build my plan", href: "/welcome" },
      };
    }
    return null;
  }

  // 2. Walkthrough of Today once they have a plan.
  if (pathname === "/dashboard" && !tours?.today) {
    return { id: "tour-offer-today", text: TOURS.today.offer, tour: "today" };
  }

  // Once, right after the first scan, on the home screen: offer gentle
  // reminders. The browser's own permission prompt only appears if they say yes.
  if (pathname === "/dashboard" && state.pushAskDue && !done("push-ask")) {
    return {
      id: "push-ask",
      text: "Want a gentle nudge now and then? I can remind you about your scan and routine. Only a couple a day, never spammy.",
      cta: { label: "Yes, remind me", action: "enable-push" },
    };
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
      text: `Want to tick a routine step today? Your ${state.streak}-day streak will thank you.`,
      cta: { label: "Open my plan", href: "/routine" },
    };
  }
  if (!state.activeToday && state.streak === 0 && state.longestStreak >= 3 && !done("welcome-back")) {
    return {
      id: "welcome-back",
      text: `Welcome back${name ? `, ${name}` : ""}! Your longest run so far is ${state.longestStreak} days. Ready to start a fresh one?`,
      cta: { label: "Open my plan", href: "/routine" },
    };
  }
  // Skin changes slowly, so the only ask besides the routine is a check-in:
  // a 30-second self-rating, with a scan as an optional extra.
  if (state.checkInDue && !done("check-in-due")) {
    return {
      id: "check-in-due",
      text: `${name ? `${name}, y` : "Y"}our check-in is ready. Rate how your skin feels and see how far your plan has taken you.`,
      cta: { label: "Do my check-in", href: "/routine" },
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
  if (routinesDone && !done("all-done")) {
    return { id: "all-done", text: "Every step ticked. You're glowing today. See you tomorrow!" };
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
    "Plan time! Tick each step as you go and I'll cheer you on.",
    "Little steps, big glow. Let's get through today's steps!",
    "Your plan is my favourite page. Let's do this!",
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
  "/welcome": [
    "One selfie and your plan starts. Soft light, relaxed face!",
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
      `Scan complete${name ? `, ${name}` : ""}! That's your starting point. Proud of you!`,
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
