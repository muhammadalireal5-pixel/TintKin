// A finishable weekly target ("4 of 5 days") instead of an endless counter.
// "Days" are any day you scanned or ticked a routine step.
export default function WeeklyGoalRing({ days = 0, target = 5, size = 52 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const done = days >= target;
  const fill = Math.min(1, days / target);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.min(days, target)} of ${target} days this week`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fill)}
          className={`${done ? "stroke-success" : "stroke-accent"} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-primary tabular-nums">
        {Math.min(days, target)}/{target}
      </span>
    </div>
  );
}
