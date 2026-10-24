"use client";

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SKIN_METRICS } from "@/lib/constants/metrics";
import { getOlderSelfies } from "@/app/lib/actions";
import { rollingAverage } from "@/lib/utils/trend";

export default function ProgressChart({ allSelfies, hasMore = false }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [older, setOlder] = useState({ anchor: null, items: [], hasMore: null });

  const safeSelfies = allSelfies || [];

  // Older pages are only valid for the window they were loaded against; if a
  // new scan shifts the window, fall back to the server-provided list.
  const anchor = safeSelfies[safeSelfies.length - 1]?._id ?? null;
  const olderValid = older.anchor === anchor;
  const olderItems = olderValid ? older.items : [];
  const canLoadMore = olderValid && older.hasMore !== null ? older.hasMore : hasMore;
  const selfies = [...olderItems, ...safeSelfies];

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

  const analyzed = selfies.filter(selfie => selfie.isAnalyzed !== false && typeof selfie.overallScore === 'number');
  const averages = rollingAverage(analyzed.map(s => ({ at: s.takenAt, score: s.overallScore })));
  const data = analyzed.map((selfie, i) => {
    const date = new Date(selfie.takenAt);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      scan: selfie.overallScore,
      trend: averages[i],
    };
  });

  if (data.length === 0) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center text-center px-6">
        <p className="text-sm text-muted">
          Not enough analyzed scans yet. Your first scan sets your starting point.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[300px] flex flex-col">
      {canLoadMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="self-start mb-2 text-xs font-medium text-accent hover:text-accent-deep transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "← Load earlier scans"}
        </button>
      )}
      {/* Fixed height, not h-full/flex-1: ResponsiveContainer measures its
          direct parent on mount, and a height inherited through an animated
          (DashboardSection's collapse/expand) or flex-computed ancestor can
          get measured as 0 before that ancestor settles, leaving the chart
          permanently blank even though data is present. */}
      <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tk-border-solid)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: 'var(--tk-text-muted)' }} 
            dy={10}
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: 'var(--tk-text-muted)' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid var(--tk-border-solid)', background: 'var(--tk-surface-card)', boxShadow: '0 4px 20px rgba(74,42,31,0.08)' }}
            labelStyle={{ fontWeight: 'bold', color: 'var(--tk-text-primary)', marginBottom: '8px' }}
          />
          {/* Single scans swing with lighting, so they are faint dots and the
              line is the 7-day average. */}
          <Line
            type="monotone"
            dataKey="scan"
            stroke="none"
            dot={{ r: 3, fill: 'var(--tk-accent)', fillOpacity: 0.35, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            name="Single scan"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--tk-accent)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            name="7-day average"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
