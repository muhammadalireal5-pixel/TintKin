"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer
} from "recharts";

export default function RadarChartClient({ scores }) {
  const data = Object.entries(scores).map(([subject, value]) => ({ subject, value }));

  return (
    <div style={{ height: '320px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: 'rgba(240,234,250,0.6)', fontFamily: 'var(--font-outfit, inherit)' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'rgba(240,234,250,0.35)' }}
            stroke="rgba(255,255,255,0.05)"
          />
          <Radar
            dataKey="value"
            stroke="#C13383"
            fill="#792CA2"
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}