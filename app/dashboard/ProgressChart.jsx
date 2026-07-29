"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressChart({ allSelfies }) {
  if (!allSelfies || allSelfies.length === 0) return null;

  // Format data for Recharts
  const data = allSelfies.map((selfie) => {
    const date = new Date(selfie.takenAt);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      overall: selfie.overallScore,
      wrinkles: selfie.scores?.wrinkles || 0,
      firmness: selfie.scores?.firmness || 0,
      spots: selfie.scores?.spots || 0,
      radiance: selfie.scores?.radiance || 0,
    };
  });

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E6FA" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            dy={10}
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            labelStyle={{ fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }}
          />
          {/* Overall Trend Line */}
          <Line 
            type="monotone" 
            dataKey="overall" 
            stroke="#8A9A5B" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#8A9A5B', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }} 
            name="Overall Harmony"
          />
          {/* Optional: we could add lines for individual scores here, but let's keep it clean with just overall for now, or add them with different colors if the user wants. */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
