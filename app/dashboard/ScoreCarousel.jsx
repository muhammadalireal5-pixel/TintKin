"use client";

import { useState, useEffect, useRef } from "react";

export default function ScoreCarousel({ scores, weeklyScores }) {
  const [activeGroup, setActiveGroup] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const groups = [
    [
      { key: "wrinkles", val: scores.wrinkles, weeklyVal: weeklyScores?.wrinkles, label: "Wrinkle Smoothness" },
      { key: "firmness", val: scores.firmness, weeklyVal: weeklyScores?.firmness, label: "Firmness" },
    ],
    [
      { key: "spots", val: scores.spots, weeklyVal: weeklyScores?.spots, label: "Spot Clarity" },
      { key: "radiance", val: scores.radiance, weeklyVal: weeklyScores?.radiance, label: "Radiance" },
    ],
  ];

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveGroup((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const timerRef = useRef(null);

  const handleSwipe = (direction) => {
    setActiveGroup((prev) => (prev === 0 ? 1 : 0));
  };

  const touchStartXRef = useRef(0);
  const onTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsHovered(true);
  };
  const onTouchEnd = (e) => {
    setIsHovered(false);
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartXRef.current - touchEndX > 50) handleSwipe("left");
    if (touchStartXRef.current - touchEndX < -50) handleSwipe("right");
  };

  const currentScores = groups[activeGroup];

  return (
    <div 
      className="col-span-1 md:col-span-3 lg:col-span-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted">Core Metrics</p>
        <div className="flex gap-2">
          {groups.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => {
                setActiveGroup(idx);
                setIsHovered(true);
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => setIsHovered(false), 3000);
              }}
              className={`w-2 h-2 rounded-full transition-all ${activeGroup === idx ? "bg-primary w-4" : "bg-primary/20 hover:bg-primary/40"}`}
              aria-label={`Show metrics group ${idx + 1}`}
            />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {currentScores.map(({ key, val, weeklyVal, label }) => {
          const wVal = weeklyVal ?? val;
          const delta = val - wVal;
          return (
          <div key={key} className="tk-glass p-6 animate-fade-in transition-all relative overflow-hidden group">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">{label}</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-3xl font-display text-primary">{val}</p>
              {delta !== 0 && (
                <span className={`text-xs font-semibold ${delta > 0 ? 'text-sage' : 'text-orange-400'}`}>
                  {delta > 0 ? `+${delta} ↑` : `${delta} ↓`}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-4">
              Week Avg: {wVal}
            </p>
            <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden relative">
                <div 
                    className="absolute h-full rounded-full transition-all duration-1000 ease-out z-10"
                    style={{ 
                        width: `${val}%`, 
                        backgroundColor: val > 75 ? 'var(--tk-accent-sage)' : val > 50 ? '#E8A838' : '#D4614B'
                    }}
                />
                <div 
                    className="absolute h-full rounded-full transition-all duration-1000 ease-out opacity-30"
                    style={{ 
                        width: `${wVal}%`, 
                        backgroundColor: '#6B7280'
                    }}
                />
            </div>
            {val > 75 && <p className="text-[10px] text-sage font-medium mt-2 leading-tight">Great health indicator.</p>}
            {key === 'wrinkles' && val > 75 && <p className="text-[10px] text-sage font-medium mt-2 leading-tight">Your skin is {val}% wrinkle proof!</p>}
          </div>
        )})}
      </div>
    </div>
  );
}
