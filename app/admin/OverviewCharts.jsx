"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function Sparkline({ data, dataKey, color = "var(--tk-accent)" }) {
  const values = data.map((d) => d[dataKey]);
  const max = Math.max(1, ...values);
  const w = 160;
  const h = 28;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7 mt-3" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ActivityChart({ data }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--tk-border-solid)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} interval={3} tick={{ fontSize: 10, fontFamily: "ui-monospace, monospace", fill: "var(--tk-text-muted)" }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fontFamily: "ui-monospace, monospace", fill: "var(--tk-text-muted)" }} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--tk-border-solid)", background: "var(--tk-surface-card)", fontSize: 12 }} />
          <Line type="monotone" dataKey="scans" name="Scans" stroke="var(--tk-accent)" strokeWidth={1.8} dot={false} />
          <Line type="monotone" dataKey="signups" name="Sign-ups" stroke="var(--tk-cocoa)" strokeWidth={1.8} dot={false} />
          <Line type="monotone" dataKey="sims" name="Simulations" stroke="var(--tk-success)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
