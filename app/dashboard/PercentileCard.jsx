"use client";

import { useState, useEffect } from "react";
import { getPercentileRank, optInComparison } from "@/app/lib/actions";

export default function PercentileCard({ optedIn }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState(optedIn);

  useEffect(() => {
    if (isOptedIn) {
      setLoading(true);
      getPercentileRank().then(res => {
        setData(res);
        setLoading(false);
      });
    }
  }, [isOptedIn]);

  const handleOptIn = async () => {
    setLoading(true);
    await optInComparison(true);
    setIsOptedIn(true);
  };

  return (
    <div className="tk-glass p-8 rounded-3xl h-full flex flex-col justify-center text-center">
      <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">Community Rank</p>
      
      {!isOptedIn ? (
        <div>
          <p className="text-sm text-muted mb-4">
            See how your skin compares to others in your age group. Your data remains completely anonymous.
          </p>
          <button onClick={handleOptIn} disabled={loading} className="px-4 py-2 bg-sage/10 text-sage text-sm font-medium rounded-full hover:bg-sage/20 transition">
            Opt-in to Compare
          </button>
        </div>
      ) : loading ? (
        <div className="animate-pulse flex space-x-4 justify-center">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : data?.notEnoughData ? (
        <p className="text-sm text-primary">Not enough peers in your age group to calculate percentile yet. Check back soon!</p>
      ) : data?.success ? (
        <div>
          <div className="flex items-end justify-center gap-1 mb-2">
            <span className="text-5xl font-display font-bold text-sage">{data.percentile}</span>
            <span className="text-lg text-sage">th</span>
          </div>
          <p className="text-sm text-primary font-medium">Percentile</p>
          <p className="text-xs text-muted mt-2">You score higher than {data.percentile}% of users your age.</p>
        </div>
      ) : (
        <p className="text-sm text-red-400">Failed to load rank.</p>
      )}
    </div>
  );
}
