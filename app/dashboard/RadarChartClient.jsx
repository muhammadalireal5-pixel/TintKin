"use client";

import { useSyncExternalStore } from "react";
import {
  RadarChart, PolarAngleAxis, PolarGrid, Radar, ResponsiveContainer, Tooltip
} from "recharts";
import { METRIC_LABELS } from "@/lib/constants/metrics";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-line">
        <p className="text-primary font-medium">{data.subject}: {data.value}</p>
        <p className="text-accent text-sm">{data.tag}</p>
      </div>
    );
  }
  return null;
};

export default function RadarChartClient({ scores }) {
  // false on the server and during hydration, true afterwards: charts need a measured container.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!scores) return null;

  if (!mounted) {
    return <div className="h-full w-full absolute inset-0 pb-6" />;
  }

  const getSupportiveTag = (value) => {
    if (value >= 80) return "Glowing";
    if (value >= 60) return "Balanced";
    return "Needs love";
  };

  const data = Object.entries(scores).map(([subject, value]) => ({
    subject: METRIC_LABELS[subject] || subject,
    value,
    tag: getSupportiveTag(value)
  }));

  return (
    <div className="h-full w-full absolute inset-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 16, right: 28, bottom: 16, left: 28 }}>
          <PolarGrid stroke="var(--tk-border-solid)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: 'var(--tk-text-muted)', fontFamily: 'var(--font-outfit, inherit)', fontWeight: 500 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            dataKey="value"
            stroke="var(--tk-accent)"
            fill="var(--tk-accent)"
            fillOpacity={0.22}
            strokeWidth={2.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
