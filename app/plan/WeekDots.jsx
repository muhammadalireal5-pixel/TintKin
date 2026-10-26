const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function WeekDots({ week, stepsTotal }) {
  return (
    <ol className="flex items-center justify-between" aria-label="This week">
      {WEEKDAYS.map((d, i) => {
        const isToday = i === week.todayIndex;
        const done = stepsTotal > 0 && i <= week.todayIndex && week.steps[i] >= stepsTotal;
        return (
          <li key={i} className="flex flex-col items-center gap-1.5 w-9">
            <span
              className={`w-3.5 h-3.5 rounded-full ${done ? "bg-accent" : "bg-line"} ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
              role="img"
              aria-label={`${d}${isToday ? " (today)" : ""}: ${done ? "all steps done" : isToday ? "in progress" : i < week.todayIndex ? "missed" : "upcoming"}`}
            />
            <span className={`tk-text-micro ${isToday ? "font-semibold text-primary" : "text-muted"}`}>{d}</span>
          </li>
        );
      })}
    </ol>
  );
}
