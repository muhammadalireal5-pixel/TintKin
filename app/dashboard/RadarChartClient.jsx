"use client";

import {
  RadarChart, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip
} from "recharts";

export default function RadarChartClient({ scores }) {
  const getSupportiveTag = (subject, value) => {
    if (value >= 80) return "Glowing";
    if (value >= 60) return "Balanced";
    return "Needs love";
  };

  const data = Object.entries(scores).map(([subject, value]) => ({ 
    subject, 
    value,
    tag: getSupportiveTag(subject, value)
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/40">
          <p className="text-primary font-medium">{data.subject}</p>
          <p className="text-sage text-sm">{data.tag}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full absolute inset-0 pb-6">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {/* Removed PolarGrid and PolarRadiusAxis to eliminate harsh grid lines */}
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: '#8E9BAA', fontFamily: 'var(--font-outfit, inherit)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            dataKey="value"
            stroke="rgba(138, 154, 91, 0.6)" // Sage
            fill="url(#radarGradient)"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E6E6FA" /> {/* Lavender */}
              <stop offset="100%" stopColor="#8A9A5B" stopOpacity={0.5} /> {/* Sage */}
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}