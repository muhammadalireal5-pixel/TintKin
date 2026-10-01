"use client";

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SKIN_METRICS } from "@/lib/constants/metrics";
import { getOlderSelfies } from "@/app/lib/actions";

export default function ProgressChart({ allSelfies, hasMore = false }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [older, setOlder] = useState({ anchor: null, items: [], hasMore: null });

  if (!allSelfies || allSelfies.length === 0) return null;

  // Older pages are only valid for the window they were loaded against; if a
  // new scan shifts the window, fall back to the server-provided list.
  const anchor = allSelfies[allSelfies.length - 1]?._id ?? null;
  const olderValid = older.anchor === anchor;
  const olderItems = olderValid ? older.items : [];
  const canLoadMore = olderValid && older.hasMore !== null ? older.hasMore : hasMore;
  const selfies = [...olderItems, ...allSelfies];

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await getOlderSelfies(selfies[0].takenAt);
      if (res?.success) {
        setOlder({ anchor, items: [...res.selfies, ...olderItems], hasMore: res.hasMore });
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const data = selfies
    .filter(selfie => selfie.isAnalyzed !== false)
    .map((selfie) => {
    const date = new Date(selfie.takenAt);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      overall: typeof selfie.overallScore === 'number' ? selfie.overallScore : null,
      [SKIN_METRICS.WRINKLES]: typeof selfie.scores?.wrinkles === 'number' ? selfie.scores.wrinkles : null,
      [SKIN_METRICS.FIRMNESS]: typeof selfie.scores?.firmness === 'number' ? selfie.scores.firmness : null,
      [SKIN_METRICS.SPOTS]: typeof selfie.scores?.spots === 'number' ? selfie.scores.spots : null,
      [SKIN_METRICS.RADIANCE]: typeof selfie.scores?.radiance === 'number' ? selfie.scores.radiance : null,
    };
  });

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col">
      {canLoadMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="self-start mb-2 text-xs font-medium text-muted hover:text-primary transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "← Load earlier scans"}
        </button>
      )}
      <div className="flex-1 min-h-[300px]">
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
          <Line 
            type="monotone" 
            dataKey="overall" 
            stroke="#8A9A5B" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#8A9A5B', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }} 
            name="Overall Harmony"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
