import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { fetchAdminOverview } from "@/lib/services/admin-overview";
import AdminShell, { AdminLabel } from "./AdminShell";
import { ActivityChart, Sparkline } from "./OverviewCharts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Overview | TintKin Admin",
  robots: { index: false, follow: false },
};

const usd = (n) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

const VERDICT_TONE = { good: "text-success", caution: "text-warn", avoid: "text-danger", neutral: "text-muted" };

const SERIF = { fontFamily: "var(--font-wordmark)" };

function ago(iso, now) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function SectionHead({ title, note }) {
  return (
    <div className="flex items-end justify-between gap-3 pb-3 border-b border-line">
      <h2 className="text-xl sm:text-[1.35rem] text-primary" style={SERIF}>{title}</h2>
      {note}
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="mt-8 first:mt-2">
      <SectionHead title={title} note={note ? <AdminLabel>{note}</AdminLabel> : null} />
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-line">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, accent = false, children }) {
  return (
    <div className="px-4 py-4 min-w-0 border-line border-b lg:border-b-0 [&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
      <AdminLabel>{label}</AdminLabel>
      <p className={`mt-1.5 text-3xl leading-none tabular-nums ${accent ? "text-accent" : "text-primary"}`} style={SERIF}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted leading-snug">{sub}</p>}
      {children}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");
  const o = await fetchAdminOverview();
  const now = new Date(o.generatedAt).getTime();
  const r = o.coach.reactions;
  const reactionTotal = r.fine + r.tingle + r.irritated + r.breakout;

  return (
    <AdminShell current="overview" session={session}>
      <Section title="Subscriptions" note="Live">
        <Stat label="MRR" value={usd(o.subscriptions.mrr)} accent sub={`${o.subscriptions.paying} paying members`} />
        <Stat label="Standard · Pro" value={`${o.subscriptions.standard} · ${o.subscriptions.premium}`} sub="$8 and $15 a month" />
        <Stat label="Free → paid" value={`${o.subscriptions.conversion}%`} sub="of onboarded accounts" />
        <Stat label="YouCam cost · 30d" value={usd(o.youcam.cost30)} sub={`${o.youcam.scans30} scans · ${o.youcam.sims30} simulations`} />
      </Section>

      <Section title="Coaching" note="Rolling 30 days">
        <Stat label="Active today" value={o.coach.activeToday} sub="ticked a routine step today" />
        <Stat label="Care days · 30d" value={o.coach.careDays} sub={`${o.coach.mirrorChecks} mirror checks`} />
        <Stat label="Coached plans" value={o.coach.coachedPlans} sub={`of ${o.coach.activePlans} active plans`} />
        <Stat
          label="Reactions · 30d"
          value={reactionTotal}
          sub={reactionTotal ? `${r.fine} fine · ${r.tingle} tingle · ${r.irritated} irritated · ${r.breakout} breakout` : "none logged yet"}
        />
      </Section>

      <Section title="All time" note="Lines · last 30 days">
        <Stat label="Total users" value={o.allTime.totalUsers} sub={`${o.allTime.signups30} new in 30 days · ${o.allTime.onboarded} onboarded`}>
          <Sparkline data={o.series} dataKey="signups" color="var(--tk-cocoa)" />
        </Stat>
        <Stat label="Skin scans" value={o.allTime.totalScans} sub={`${o.youcam.lowShare}% low-confidence in 30 days`}>
          <Sparkline data={o.series} dataKey="scans" />
        </Stat>
        <Stat label="Simulations" value={o.allTime.totalSims} sub={`${o.youcam.sims30} in 30 days`}>
          <Sparkline data={o.series} dataKey="sims" color="var(--tk-success)" />
        </Stat>
        <Stat label="Product checks" value={o.allTime.totalChecks} sub={`${o.allTime.checks30} in 30 days`} />
      </Section>

      <div className="mt-8 grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8">
        <section className="min-w-0">
          <SectionHead
            title="Scans & sign-ups"
            note={
              <AdminLabel className="hidden sm:block">
                <span className="text-accent">—</span> Scans · <span className="text-cocoa">—</span> Sign-ups · <span className="text-success">- -</span> Sims
              </AdminLabel>
            }
          />
          <div className="pt-4"><ActivityChart data={o.series} /></div>
          <p className="mt-2 text-xs italic text-muted">Last 30 days, per day (UTC). Scans and simulations are YouCam calls.</p>
        </section>

        <section className="min-w-0">
          <SectionHead title="Recent product checks" note={<Link href="/products" className="text-xs font-semibold text-accent">Try it →</Link>} />
          {o.recentChecks.length ? (
            <ul className="divide-y divide-line">
              {o.recentChecks.map((c) => (
                <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate" style={SERIF}>{c.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] mt-0.5">
                      <span className={VERDICT_TONE[c.verdict] ?? "text-muted"}>{c.verdict}</span>
                      {c.classes.length > 0 && <span className="text-muted"> · {c.classes.join(" · ")}</span>}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted shrink-0">{ago(c.at, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-sm text-muted">No product checks yet.</p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
