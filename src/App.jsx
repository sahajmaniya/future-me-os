import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FutureMe OS — Single-file, preview-ready React app
 * - Tailwind CSS styling
 * - Framer Motion animations
 * - LocalStorage persistence
 * - Mock AI responses (no API keys)
 */

// ---------------------------
// Utilities
// ---------------------------
const LS_KEY = "futureme_os_v1";

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad2(m)}:${pad2(s)} ${ampm}`;
}

function formatDate(d) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function msToParts(ms) {
  const total = Math.max(0, ms);
  const sec = Math.floor(total / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return { days, hours, minutes, seconds };
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function greetingForHour(h) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// ---------------------------
// Mock AI engine
// ---------------------------
const MOCK_QUOTES = [
  "Your future self is watching — make them proud.",
  "Small steps, taken daily, become massive results.",
  "Consistency beats intensity. Show up, gently.",
  "Energy follows focus. Choose what deserves your attention.",
  "Progress is a pattern — keep weaving.",
  "Today’s discipline is tomorrow’s freedom.",
  "You don’t need more time — you need more clarity.",
  "Treat your habits like assets: compound them.",
];

function analyzeDayMock(input, mood, habits, goal) {
  const text = (input || "").trim();
  const wordCount = text ? text.split(/\s+/).length : 0;

  const habitScore = Object.values(habits || {}).filter(Boolean).length;
  const habitTotal = Math.max(1, Object.keys(habits || {}).length);
  const habitPct = Math.round((habitScore / habitTotal) * 100);

  const moodLabel = mood?.label || "Unselected";

  const focusCue =
    wordCount === 0
      ? "You didn’t write much — that’s okay. Even one honest sentence can unlock momentum."
      : wordCount < 40
      ? "Your reflection is concise — likely highlighting what mattered most."
      : wordCount < 120
      ? "You captured a balanced snapshot of your day — strong awareness."
      : "You went deep today — that level of detail often signals growth and intention.";

  const goalCue =
    goal >= 80
      ? "Your goal progress is strong — protect the rhythm you’ve built."
      : goal >= 50
      ? "You’re past the halfway point — keep your next step small and obvious."
      : "You’re still in the early arc — the best time to build a simple routine.";

  const suggestionPool = [
    "Pick one 10-minute action that moves your main goal forward and do it before you open social apps.",
    "Do a 2-minute reset: tidy one surface, then drink water — momentum loves clean starts.",
    "Write tomorrow’s ‘first step’ as a single verb (e.g., Draft, Walk, Call). Make it unmissable.",
    "Choose one habit to ‘make easier’ — reduce friction by preparing it tonight.",
    "Do a quick brain-dump, then circle the one item that truly matters. Everything else is optional.",
    "Set a gentle boundary: one focused block, then a real break. Treat your energy like a budget.",
  ];
  const encouragementPool = [
    "You’re building a system, not chasing a streak. Keep it kind and keep it moving.",
    "Even imperfect days are data. You’re learning what works — and that’s winning.",
    "Your future self benefits from every small improvement you make today.",
    "Momentum is quiet. Trust the compounding.",
    "You’re closer than you feel. Do the next right thing — then breathe.",
  ];

  // Mood-aware twist
  const moodModifier =
    moodLabel === "Radiant"
      ? "Channel that energy into one bold step."
      : moodLabel === "Good"
      ? "Keep the pace steady and protect your attention."
      : moodLabel === "Okay"
      ? "Aim for a gentle win — something small that restores confidence."
      : moodLabel === "Low"
      ? "Keep it soft. Lower the bar and focus on care + recovery."
      : moodLabel === "Stressed"
      ? "Prioritize calm: breathe, simplify, and pick a single controllable action."
      : "";

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const insight = [
    focusCue,
    `Habits today: ${habitScore}/${habitTotal} (${habitPct}%).`,
    `Mood: ${moodLabel}.`,
    goalCue,
    moodModifier,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    insight,
    suggestion: pick(suggestionPool),
    encouragement: pick(encouragementPool),
  };
}

// ---------------------------
// UI bits
// ---------------------------
function GlassCard({ className, children, hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={classNames(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {/* subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-60" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function NeonButton({ className, children, onClick, type = "button", disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "group relative inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium",
        "text-white transition-all",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 active:translate-y-0",
        className
      )}
    >
      <span
        className={classNames(
          "absolute inset-0 rounded-2xl",
          "bg-gradient-to-r from-purple-500/80 via-fuchsia-500/70 to-sky-500/80",
          "blur-md opacity-60 group-hover:opacity-90 transition-opacity"
        )}
      />
      <span
        className={classNames(
          "absolute inset-0 rounded-2xl",
          "bg-gradient-to-r from-purple-500 via-blue-500 to-sky-400",
          "opacity-80 group-hover:opacity-90 transition-opacity"
        )}
      />
      <span className="relative flex items-center gap-2">
        {children}
        <span className="h-1.5 w-1.5 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </button>
  );
}

function SoftInput({ value, onChange, placeholder, type = "text", className }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={classNames(
        "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2",
        "text-white placeholder:text-white/40 outline-none",
        "focus:border-white/20 focus:ring-2 focus:ring-purple-500/30",
        className
      )}
    />
  );
}

function SoftTextarea({ value, onChange, placeholder, rows = 5, className }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={classNames(
        "w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3",
        "text-white placeholder:text-white/40 outline-none",
        "focus:border-white/20 focus:ring-2 focus:ring-purple-500/30",
        className
      )}
    />
  );
}

function Pill({ active, children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "rounded-2xl px-3 py-2 text-sm transition-all",
        active
          ? "bg-white/10 text-white border border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white",
        className
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={classNames(
        "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
        "transition-all hover:bg-white/10"
      )}
    >
      <div className="text-left">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-white/50">Tap to {checked ? "disable" : "enable"}</div>
      </div>
      <div
        className={classNames(
          "relative h-7 w-12 rounded-full border border-white/15 transition-all",
          checked
            ? "bg-gradient-to-r from-purple-500/70 to-sky-500/70 shadow-[0_0_18px_rgba(99,102,241,0.35)]"
            : "bg-black/30"
        )}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
          className={classNames(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white",
            checked ? "left-5" : "left-0.5"
          )}
        />
      </div>
    </button>
  );
}

function ProgressRing({ value = 0, size = 120, stroke = 10 }) {
  const pct = clamp(value, 0, 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-white/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none"
          style={{
            stroke: "url(#grad)",
            strokeDasharray: c,
            strokeDashoffset: offset,
          }}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-semibold tracking-tight text-white">{pct}%</div>
        <div className="text-xs text-white/60">Goal</div>
      </div>
    </div>
  );
}

// ---------------------------
// Main App
// ---------------------------
export default function FutureMeOS() {
  const [now, setNow] = useState(() => new Date());
  const [hydrated, setHydrated] = useState(false);

  // Persisted state
  const [goal, setGoal] = useState(62);
  const [habits, setHabits] = useState({
    "Morning focus block": true,
    "Move body (10 min)": false,
    "Hydrate +1L": true,
    "Read 10 pages": false,
  });
  const moodOptions = useMemo(
    () => [
      { id: "radiant", label: "Radiant", emoji: "🤩" },
      { id: "good", label: "Good", emoji: "😊" },
      { id: "okay", label: "Okay", emoji: "🙂" },
      { id: "low", label: "Low", emoji: "😕" },
      { id: "stressed", label: "Stressed", emoji: "😣" },
    ],
    []
  );
  const [moodId, setMoodId] = useState("good");

  const [quote, setQuote] = useState(() => MOCK_QUOTES[0]);

  const [reflection, setReflection] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [capsuleMsg, setCapsuleMsg] = useState("");
  const [capsuleDate, setCapsuleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [capsules, setCapsules] = useState([]); // {id, message, dateISO, createdAt, sealed}

  const scrollRef = useRef(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = safeParse(raw, null);
      if (data) {
        if (typeof data.goal === "number") setGoal(clamp(data.goal, 0, 100));
        if (data.habits && typeof data.habits === "object") setHabits(data.habits);
        if (typeof data.moodId === "string") setMoodId(data.moodId);
        if (typeof data.quote === "string") setQuote(data.quote);
        if (typeof data.reflection === "string") setReflection(data.reflection);
        if (data.aiResult && typeof data.aiResult === "object") setAiResult(data.aiResult);
        if (Array.isArray(data.capsules)) setCapsules(data.capsules);
      }
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      goal,
      habits,
      moodId,
      quote,
      reflection,
      aiResult,
      capsules,
      updatedAt: Date.now(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }, [goal, habits, moodId, quote, reflection, aiResult, capsules, hydrated]);

  const mood = useMemo(() => moodOptions.find((m) => m.id === moodId) || moodOptions[0], [moodId, moodOptions]);

  const greeting = useMemo(() => greetingForHour(now.getHours()), [now]);

  // Smooth scroll behavior (global)
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  const pickQuote = () => {
    const idx = Math.floor(Math.random() * MOCK_QUOTES.length);
    setQuote(MOCK_QUOTES[idx]);
  };

  const runAnalysis = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiResult(null);

    // simulate latency
    await new Promise((r) => setTimeout(r, 650));

    const res = analyzeDayMock(reflection, mood, habits, goal);
    setAiResult({ ...res, at: Date.now() });
    setAiBusy(false);

    // subtle scroll into view
    setTimeout(() => {
      const el = document.getElementById("ai-result");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  };

  const addCapsule = () => {
    const msg = (capsuleMsg || "").trim();
    if (!msg) return;
    const dateISO = capsuleDate;
    if (!dateISO) return;

    const id = uid();
    const createdAt = Date.now();

    setCapsules((prev) => [
      {
        id,
        message: msg,
        dateISO,
        createdAt,
        sealed: true,
      },
      ...prev,
    ]);
    setCapsuleMsg("");
  };

  const removeCapsule = (id) => {
    setCapsules((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleSeal = (id) => {
    setCapsules((prev) =>
      prev.map((c) => (c.id === id ? { ...c, sealed: !c.sealed } : c))
    );
  };

  const openCapsule = (id) => {
    setCapsules((prev) =>
      prev.map((c) => (c.id === id ? { ...c, sealed: false } : c))
    );
  };

  const resetAll = () => {
    localStorage.removeItem(LS_KEY);
    // Keep app feeling alive: reset to defaults
    setGoal(62);
    setHabits({
      "Morning focus block": true,
      "Move body (10 min)": false,
      "Hydrate +1L": true,
      "Read 10 pages": false,
    });
    setMoodId("good");
    setQuote(MOCK_QUOTES[0]);
    setReflection("");
    setAiResult(null);
    setCapsules([]);
  };

  const heroBg = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -inset-24 opacity-60"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "radial-gradient(60% 40% at 20% 10%, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0) 60%), radial-gradient(50% 40% at 85% 30%, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0) 60%), radial-gradient(60% 50% at 40% 85%, rgba(99,102,241,0.40) 0%, rgba(99,102,241,0) 60%)",
          backgroundSize: "140% 140%",
          backgroundPosition: "0% 50%",
          filter: "blur(24px)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black" />
      <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white" ref={scrollRef}>
      {/* Top glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-purple-500/10 via-sky-500/5 to-transparent blur-2xl" />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-sky-500/20 blur-md" />
              <div className="relative text-lg font-semibold">⌁</div>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">FutureMe OS</div>
              <div className="text-xs text-white/50">A premium AI productivity cockpit</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#dashboard"
              className="hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white md:inline-block"
            >
              Dashboard
            </a>
            <a
              href="#reflection"
              className="hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white md:inline-block"
            >
              Reflection
            </a>
            <a
              href="#capsule"
              className="hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white md:inline-block"
            >
              Time Capsule
            </a>

            <NeonButton onClick={resetAll} className="ml-1 px-3 py-2 text-xs">
              Reset
            </NeonButton>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden" aria-label="Hero">
        {heroBg}

        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="grid gap-8 md:grid-cols-12 md:items-center"
          >
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-sky-500 shadow-[0_0_16px_rgba(56,189,248,0.45)]" />
                Live, local-first, no backend needed
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
                Your future-self
                <span className="bg-gradient-to-r from-purple-300 via-white to-sky-200 bg-clip-text text-transparent">
                  {" "}operating system
                </span>
                .
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                FutureMe OS blends goal progress, habits, mood, reflections, and a time capsule — all in a premium,
                glassmorphic dashboard powered by mock AI.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <NeonButton
                  onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-5 py-3"
                >
                  Enter Dashboard
                </NeonButton>
                <a
                  href="#capsule"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Create a Time Capsule
                </a>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {["Local-first", "Neon Glass UI", "Mock AI", "Responsive", "Smooth Animations", "Instant Preview"].map(
                  (t) => (
                    <div
                      key={t}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 backdrop-blur"
                    >
                      {t}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="md:col-span-5">
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-white/60">{greeting},</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Future You</div>
                    <div className="mt-2 text-sm text-white/60">{formatDate(now)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <div className="text-xs text-white/50">Local time</div>
                    <div className="text-lg font-semibold tracking-tight">{formatTime(now)}</div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Today’s focus</div>
                        <div className="text-sm font-medium">One meaningful step</div>
                      </div>
                      <div className="text-xl">✨</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">System status</div>
                        <div className="text-sm font-medium">Calm • Ready • Aligned</div>
                      </div>
                      <div className="text-xl">🧠</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Mood</div>
                        <div className="text-sm font-medium">
                          {mood.emoji} {mood.label}
                        </div>
                      </div>
                      <div className="text-xl">🌙</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 md:px-6">
        {/* Dashboard */}
        <section id="dashboard" className="scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
              <p className="mt-1 text-sm text-white/60">A living snapshot of who you’re becoming.</p>
            </div>
            <div className="hidden text-right md:block">
              <div className="text-xs text-white/50">Live clock</div>
              <div className="text-sm font-semibold">{formatTime(now)}</div>
            </div>
          </motion.div>

          <div className="mt-6 grid gap-4 md:grid-cols-12">
            {/* Goal progress */}
            <GlassCard className="md:col-span-4">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">Goal Progress</div>
                    <div className="mt-1 text-xs text-white/50">Adjust your trajectory</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    {goal >= 80 ? "On fire" : goal >= 50 ? "On track" : "Warming up"}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center">
                  <ProgressRing value={goal} />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>0</span>
                    <span>100</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={goal}
                    onChange={(e) => setGoal(parseInt(e.target.value, 10))}
                    className="mt-2 w-full accent-purple-400"
                  />
                  <div className="mt-2 text-xs text-white/50">
                    Tip: increase by 1% per day — compounding wins.
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Habit tracker */}
            <GlassCard className="md:col-span-4">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">Habit Tracker</div>
                    <div className="mt-1 text-xs text-white/50">Toggle to log today</div>
                  </div>
                  <div className="text-xs text-white/60">
                    {Object.values(habits).filter(Boolean).length}/{Object.keys(habits).length} done
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {Object.entries(habits).map(([k, v]) => (
                    <Toggle
                      key={k}
                      label={k}
                      checked={!!v}
                      onChange={(next) => setHabits((prev) => ({ ...prev, [k]: next }))}
                    />
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setHabits((prev) => {
                        const next = { ...prev };
                        for (const key of Object.keys(next)) next[key] = true;
                        return next;
                      })
                    }
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    Mark all
                  </button>
                  <button
                    onClick={() =>
                      setHabits((prev) => {
                        const next = { ...prev };
                        for (const key of Object.keys(next)) next[key] = false;
                        return next;
                      })
                    }
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Mood tracker + Quote */}
            <GlassCard className="md:col-span-4">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">Mood + Motivation</div>
                    <div className="mt-1 text-xs text-white/50">Tune your day</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    {mood.emoji}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-white/60">Mood Tracker</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {moodOptions.map((m) => (
                      <Pill
                        key={m.id}
                        active={m.id === moodId}
                        onClick={() => setMoodId(m.id)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-base">{m.emoji}</span>
                        <span>{m.label}</span>
                      </Pill>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">AI Motivational Quote</div>
                    <button
                      onClick={pickQuote}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                    >
                      Random
                    </button>
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-white/80">“{quote}”</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Reflection */}
        <section id="reflection" className="mt-10 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-2xl font-semibold tracking-tight">AI Reflection</h2>
            <p className="mt-1 text-sm text-white/60">
              Write a quick check-in. FutureMe OS will generate a mock AI analysis — instant, private, local-first.
            </p>
          </motion.div>

          <div className="mt-6 grid gap-4 md:grid-cols-12">
            <GlassCard className="md:col-span-7">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Reflection Panel</div>
                    <div className="mt-1 text-xs text-white/50">What happened today? What mattered?</div>
                  </div>
                  <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 md:block">
                    Mood: {mood.emoji} {mood.label}
                  </div>
                </div>

                <div className="mt-4">
                  <SoftTextarea
                    value={reflection}
                    onChange={setReflection}
                    placeholder="Example: I made progress on my project, felt a little scattered mid-day, but got back on track after a walk..."
                    rows={7}
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-white/50">
                      Saved locally • {reflection.trim() ? `${reflection.trim().split(/\s+/).length} words` : "0 words"}
                    </div>
                    <NeonButton onClick={runAnalysis} className="px-5 py-3" disabled={aiBusy}>
                      {aiBusy ? "Analyzing…" : "Analyze My Day"}
                    </NeonButton>
                  </div>
                </div>

                <AnimatePresence>
                  {aiBusy && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="h-8 w-8 rounded-2xl bg-gradient-to-br from-purple-500/60 to-sky-500/60"
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                        />
                        <div>
                          <div className="text-sm font-semibold">Mock AI is thinking</div>
                          <div className="text-xs text-white/50">Synthesizing insight from your inputs…</div>
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30">
                        <motion.div
                          className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-sky-400"
                          initial={{ x: "-70%" }}
                          animate={{ x: "170%" }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {aiResult && !aiBusy && (
                    <motion.div
                      id="ai-result"
                      initial={{ opacity: 0, y: 12, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.99 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      className="mt-5"
                    >
                      <GlassCard className="p-5" hover={false}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">AI Insight</div>
                            <div className="mt-1 text-xs text-white/50">
                              Generated locally • {new Date(aiResult.at).toLocaleString()}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                            {mood.emoji} {mood.label}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="text-xs font-semibold text-white/70">Insight summary</div>
                            <div className="mt-2 text-sm leading-relaxed text-white/80">{aiResult.insight}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="text-xs font-semibold text-white/70">One suggestion</div>
                            <div className="mt-2 text-sm leading-relaxed text-white/80">{aiResult.suggestion}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="text-xs font-semibold text-white/70">Encouragement</div>
                            <div className="mt-2 text-sm leading-relaxed text-white/80">{aiResult.encouragement}</div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            onClick={() => setAiResult(null)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                          >
                            Dismiss
                          </button>
                          <div className="text-xs text-white/50">Pro tip: keep reflections short. Clarity compounds.</div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>

            {/* Quick stats */}
            <GlassCard className="md:col-span-5">
              <div className="p-6">
                <div className="text-sm font-semibold">Today’s Snapshot</div>
                <div className="mt-1 text-xs text-white/50">A quick, aesthetic readout</div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Goal progress</div>
                        <div className="text-lg font-semibold tracking-tight">{goal}%</div>
                      </div>
                      <div className="text-2xl">🎯</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Habits done</div>
                        <div className="text-lg font-semibold tracking-tight">
                          {Object.values(habits).filter(Boolean).length}/{Object.keys(habits).length}
                        </div>
                      </div>
                      <div className="text-2xl">✅</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Mood</div>
                        <div className="text-lg font-semibold tracking-tight">
                          {mood.emoji} {mood.label}
                        </div>
                      </div>
                      <div className="text-2xl">🌡️</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Time</div>
                        <div className="text-lg font-semibold tracking-tight">{formatTime(now)}</div>
                      </div>
                      <div className="text-2xl">⏳</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold text-white/70">Micro ritual</div>
                  <div className="mt-2 text-sm text-white/80">
                    Choose one: 2-minute tidy, 10 deep breaths, or a short walk — then do one tiny goal step.
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Time Capsule */}
        <section id="capsule" className="mt-10 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-2xl font-semibold tracking-tight">Time Capsule</h2>
            <p className="mt-1 text-sm text-white/60">
              Seal a message to your future self. Watch the countdown — then open it when the time arrives.
            </p>
          </motion.div>

          <div className="mt-6 grid gap-4 md:grid-cols-12">
            <GlassCard className="md:col-span-5">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">Create Capsule</div>
                    <div className="mt-1 text-xs text-white/50">Sealed + stored in your browser</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    {capsules.length} saved
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <SoftTextarea
                    value={capsuleMsg}
                    onChange={setCapsuleMsg}
                    placeholder="Write a message for Future You…"
                    rows={5}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs text-white/60">Open date</div>
                      <SoftInput
                        type="date"
                        value={capsuleDate}
                        onChange={setCapsuleDate}
                        className="py-2.5"
                      />
                    </div>
                    <div className="flex items-end">
                      <NeonButton
                        onClick={addCapsule}
                        className="w-full px-5 py-3"
                        disabled={!capsuleMsg.trim()}
                      >
                        Seal Capsule
                      </NeonButton>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                    <div className="flex items-center justify-between">
                      <span>Sealing effect</span>
                      <span className="text-white/70">enabled</span>
                    </div>
                    <div className="mt-2">
                      Tip: set a date at least 24 hours out for maximum suspense.
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="md:col-span-7">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Your Capsules</div>
                    <div className="mt-1 text-xs text-white/50">Countdown + reveal</div>
                  </div>
                  <button
                    onClick={() => setCapsules([])}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                    disabled={capsules.length === 0}
                  >
                    Clear all
                  </button>
                </div>

                {capsules.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                    <div className="text-3xl">📦</div>
                    <div className="mt-2 text-sm font-semibold">No capsules yet</div>
                    <div className="mt-1 text-sm text-white/60">
                      Write one message, pick a date, and seal it.
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {capsules.map((c) => (
                      <CapsuleItem
                        key={c.id}
                        capsule={c}
                        now={now}
                        onRemove={() => removeCapsule(c.id)}
                        onToggleSeal={() => toggleSeal(c.id)}
                        onOpen={() => openCapsule(c.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-semibold">FutureMe OS</div>
              <div className="text-xs text-white/50">
                Local-first mock AI • Glass UI • Neon accents • Stored in localStorage
              </div>
            </div>
            <div className="text-xs text-white/50">Built for instant preview. No backend required.</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function CapsuleItem({ capsule, now, onRemove, onToggleSeal, onOpen }) {
  const openAt = useMemo(() => {
    // dateISO is YYYY-MM-DD. Interpret as local midnight.
    const [y, m, d] = capsule.dateISO.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1, 9, 0, 0); // gentle default: 9am local
    return dt;
  }, [capsule.dateISO]);

  const msLeft = openAt.getTime() - now.getTime();
  const ready = msLeft <= 0;
  const parts = msToParts(msLeft);

  const sealed = !!capsule.sealed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={classNames(
                "grid h-9 w-9 place-items-center rounded-2xl border border-white/10",
                "bg-black/20"
              )}
            >
              <motion.div
                animate={sealed ? { rotate: [0, 2, -2, 0] } : { rotate: 0 }}
                transition={sealed ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                className={classNames(
                  "h-5 w-5 rounded-full",
                  sealed
                    ? "bg-gradient-to-br from-purple-400 to-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.35)]"
                    : "bg-white/70"
                )}
              />
            </div>

            <div>
              <div className="text-sm font-semibold">
                {sealed ? "Sealed capsule" : ready ? "Capsule opened" : "Unsealed capsule"}
              </div>
              <div className="text-xs text-white/50">
                Opens on {openAt.toLocaleDateString()} • Created {new Date(capsule.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="mt-3">
            {sealed && !ready ? (
              <SealedCapsuleVisual parts={parts} />
            ) : sealed && ready ? (
              <SealedReadyVisual />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="text-xs font-semibold text-white/70">Message</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {capsule.message}
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div
              className={classNames(
                "rounded-2xl border border-white/10 px-3 py-1.5 text-xs",
                ready ? "bg-white/10 text-white" : "bg-white/5 text-white/70"
              )}
            >
              {ready ? "Ready" : `Countdown: ${parts.days}d ${pad2(parts.hours)}h ${pad2(parts.minutes)}m ${pad2(
                parts.seconds
              )}s`}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
              {sealed ? "🔒 Sealed" : "🔓 Open"}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
          {sealed && ready && (
            <NeonButton onClick={onOpen} className="px-4 py-2 text-xs">
              Open now
            </NeonButton>
          )}
          <button
            onClick={onToggleSeal}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
          >
            {sealed ? "Unseal" : "Reseal"}
          </button>
          <button
            onClick={onRemove}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          >
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SealedCapsuleVisual({ parts }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4"
    >
      {/* animated seal shimmer */}
      <motion.div
        className="pointer-events-none absolute -inset-16 opacity-40"
        animate={{ x: ["-40%", "40%", "-40%"] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(40% 30% at 30% 30%, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0) 60%), radial-gradient(45% 35% at 70% 60%, rgba(56,189,248,0.40) 0%, rgba(56,189,248,0) 65%)",
          filter: "blur(18px)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white/70">Sealed capsule</div>
            <div className="mt-1 text-sm text-white/80">Message hidden until opening</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            🔒
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <StatBlock label="Days" value={parts.days} />
          <StatBlock label="Hours" value={pad2(parts.hours)} />
          <StatBlock label="Mins" value={pad2(parts.minutes)} />
          <StatBlock label="Secs" value={pad2(parts.seconds)} />
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
          Your message is encrypted-by-vibes (aka localStorage) — and sealed with neon wax.
        </div>
      </div>
    </motion.div>
  );
}

function SealedReadyVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-50"
        animate={{ opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(50% 40% at 35% 30%, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0) 60%), radial-gradient(50% 40% at 70% 70%, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0) 60%)",
          filter: "blur(16px)",
        }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white/70">Ready to open</div>
          <div className="mt-1 text-sm text-white/80">Your future self is waiting ✨</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">⏳</div>
      </div>
      <div className="relative mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
        Tap <span className="text-white/80">Open now</span> to reveal the message.
      </div>
    </motion.div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="text-lg font-semibold tracking-tight text-white">{value}</div>
      <div className="text-[11px] text-white/60">{label}</div>
    </div>
  );
}
