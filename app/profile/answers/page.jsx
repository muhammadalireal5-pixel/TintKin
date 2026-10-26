import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Pencil, CalendarCheck, Sun, Moon } from "lucide-react";
import { getSkinProfileForEdit } from "@/app/lib/actions";
import { getActivePlan } from "@/app/lib/plan-actions";
import PageHeader from "@/app/components/ui/PageHeader";
import {
  CONCERNS, RATING_LABELS, SENSITIVITY_OPTIONS, SUN_REACTIONS, CURRENT_PRODUCTS,
  SLEEP_OPTIONS, OUTDOOR_OPTIONS, STRESS_OPTIONS, PREGNANCY_OPTIONS, ROUTINE_TIME_OPTIONS,
} from "@/lib/constants/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Plan & Answers",
  description: "The answers you gave and the plan we built from them.",
  robots: { index: false, follow: false },
};

const labelOf = (options, value) => options.find((o) => String(o.value) === String(value))?.label || "";
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");
const months = (n) => (n ? `${n} ${n === 1 ? "month" : "months"}` : "Not chosen yet");

function Item({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line/70 last:border-0">
      <dt className="text-sm text-muted shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-primary text-right">{children || <span className="text-faint font-normal">Not answered</span>}</dd>
    </div>
  );
}

function StepList({ title, icon: Icon, steps }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary mb-2"><Icon size={15} className="text-accent" /> {title}</h3>
      {steps.length ? (
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="rounded-xl bg-paper border border-line px-3 py-2.5">
              <p className="text-sm text-primary leading-snug">{s.text}</p>
              {s.why && <p className="text-xs text-muted mt-1 leading-snug">{s.why}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No steps yet.</p>
      )}
    </div>
  );
}

/** Read-only: what the person told us, and the plan we built from it. */
export default async function AnswersPage() {
  const [res, planRes] = await Promise.all([getSkinProfileForEdit(), getActivePlan()]);
  if (!res.success) redirect("/profile");
  const a = res.initial;
  const plan = planRes?.success ? planRes.plan : null;

  return (
    <div className="tk-container pt-1 sm:pt-4 pb-10 max-w-2xl">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep mb-3">
        <ArrowLeft size={15} /> Back to profile
      </Link>
      <PageHeader title="My plan & answers" subtitle="What you told us, and the plan we built from it." />

      <section className="tk-card p-5 sm:p-6" aria-label="Your answers">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-primary">Your answers</h2>
          <Link href="/profile/skin" className="tk-pill-btn tk-btn-soft px-3.5 py-2 text-xs"><Pencil size={13} /> Edit</Link>
        </div>
        {res.hasProfile ? (
          <dl>
            <Item label="Date of birth">{a.birthDate && new Date(a.birthDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</Item>
            <Item label="Sex">{cap(a.sex)}</Item>
            <Item label="Skin type">{cap(a.skinType)}</Item>
            <Item label="Reacts to products">{labelOf(SENSITIVITY_OPTIONS, a.sensitivity)}</Item>
            <Item label="Sun reaction">{labelOf(SUN_REACTIONS, a.phototype)}</Item>
            <Item label="What you want to improve">
              {a.concerns.length > 0 && (
                <ol className="space-y-0.5">
                  {a.concerns.map((key, i) => (
                    <li key={key}>{i + 1}. {CONCERNS[key]?.label} <span className="text-muted font-normal">({RATING_LABELS[a.ratings[key]] || "not rated"})</span></li>
                  ))}
                </ol>
              )}
            </Item>
            <Item label="Already using">{a.currentProducts.length ? a.currentProducts.map((v) => labelOf(CURRENT_PRODUCTS, v)).join(", ") : "Nothing yet"}</Item>
            <Item label="Sleep">{labelOf(SLEEP_OPTIONS, a.sleep)}</Item>
            <Item label="Time in the sun">{labelOf(OUTDOOR_OPTIONS, a.outdoor)}</Item>
            <Item label="Stress">{labelOf(STRESS_OPTIONS, a.stress)}</Item>
            <Item label="Smoke or vape">{typeof a.smoker === "boolean" ? (a.smoker ? "Yes" : "No") : ""}</Item>
            {a.sex !== "male" && <Item label="Pregnant or breastfeeding">{labelOf(PREGNANCY_OPTIONS, a.pregnancy)}</Item>}
            <Item label="Time for your routine">{labelOf(ROUTINE_TIME_OPTIONS, a.routineTime)}</Item>
            <Item label="Plan length">{months(a.planMonths)}</Item>
          </dl>
        ) : (
          <p className="text-sm text-muted mt-2">You haven&apos;t answered the skin questions yet. <Link href="/profile/skin" className="font-semibold text-accent">Answer them now</Link> and we&apos;ll build your plan.</p>
        )}
      </section>

      <section className="tk-card p-5 sm:p-6 mt-4" aria-label="Your plan">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">Your plan</h2>
          {plan && <Link href="/routine" className="tk-pill-btn tk-btn-soft px-3.5 py-2 text-xs">Open plan</Link>}
        </div>
        {plan ? (
          <div className="mt-3 space-y-5">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="tk-chip"><CalendarCheck size={12} /> {plan.totalMonths > 1 ? `Month ${plan.monthIndex} of ${plan.totalMonths} · ` : ""}Day {plan.day} of {plan.durationDays}</span>
              <span className="tk-chip">{plan.phase.name}</span>
            </p>
            <p className="text-sm text-primary/90 leading-relaxed">{plan.summary}</p>
            {plan.progress.focus.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Focus areas</h3>
                <ul className="space-y-1 text-sm text-primary">
                  {plan.progress.focus.map((f) => (
                    <li key={f.metric}>{f.label} <span className="text-muted">
                      {f.scale === "rating" ? `· from ${RATING_LABELS[f.baseline]}, aiming for ${RATING_LABELS[f.target]}` : `· from ${f.baseline}, aiming for ${f.target}`}
                    </span></li>
                  ))}
                </ul>
              </div>
            )}
            <StepList title="Morning, today" icon={Sun} steps={plan.steps.am} />
            <StepList title="Evening, today" icon={Moon} steps={plan.steps.pm} />
            {plan.upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Coming up this month</h3>
                <ul className="space-y-2">
                  {plan.upcoming.map((g) => (
                    <li key={g.startDay} className="text-sm">
                      <p className="font-medium text-primary">From day {g.startDay}</p>
                      <ul className="mt-0.5 space-y-0.5 text-muted">
                        {g.steps.map((s) => <li key={s.id}>{s.text}</li>)}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted mt-2">You don&apos;t have a plan yet. It&apos;s built from your answers.</p>
        )}
      </section>
    </div>
  );
}
