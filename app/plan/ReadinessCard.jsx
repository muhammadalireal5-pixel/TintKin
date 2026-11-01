import { ShieldCheck, Gauge, HeartPulse } from "lucide-react";
import { INGREDIENT_CLASSES } from "@/lib/plan/knowledge";

const LEVELS = {
  green: { title: "Ready for your full routine", tone: "bg-success-soft text-success", dot: "bg-success", icon: ShieldCheck, fallback: "No reactions lately. Your actives run on their scheduled nights." },
  amber: { title: "An easy day", tone: "bg-warn-soft text-warn", dot: "bg-warn", icon: Gauge, fallback: "We hold your actives where they are today." },
  red: { title: "Recovery day", tone: "bg-danger-soft text-danger", dot: "bg-danger", icon: HeartPulse, fallback: "Barrier care only until your skin settles." },
};

export default function ReadinessCard({ coach }) {
  if (!coach?.readiness) return null;
  const level = LEVELS[coach.readiness.level] ?? LEVELS.green;
  const Icon = level.icon;
  const reason = coach.readiness.reasons?.[0] ?? level.fallback;
  return (
    <section className="tk-card p-4 flex items-start gap-3" aria-label="Skin readiness today">
      <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${level.tone}`}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${level.dot}`} aria-hidden="true" />
          <p className="text-sm font-semibold text-primary">{level.title}</p>
        </div>
        <p className="mt-0.5 text-sm text-muted leading-snug line-clamp-2">{reason}</p>
        {coach.ladders?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {coach.ladders.slice(0, 3).map((l) => (
              <span key={l.id} className="tk-chip">{INGREDIENT_CLASSES[l.cls]?.label ?? "Active"} · {l.schedule}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
