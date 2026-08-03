"use client";

import { useState, useEffect } from "react";

export default function ScoreCarousel({ scores }) {
  // We have 4 scores, we want to show 2 at a time.
  // Group 0: Wrinkles & Firmness
  // Group 1: Spots & Radiance
  const [activeGroup, setActiveGroup] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const groups = [
    [
      { key: "wrinkles", val: scores.wrinkles, label: "Wrinkles" },
      { key: "firmness", val: scores.firmness, label: "Firmness" },
    ],
    [
      { key: "spots", val: scores.spots, label: "Spots" },
      { key: "radiance", val: scores.radiance, label: "Radiance" },
    ],
  ];

  // Auto-rotate every 3 seconds, pause if hovered/interacted
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveGroup((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleSwipe = (direction) => {
    // If direction is 'left', go to next. If 'right', go to prev.
    setActiveGroup((prev) => (prev === 0 ? 1 : 0));
  };

  // Simple touch swipe logic
  let touchStartX = 0;
  const onTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    setIsHovered(true);
  };
  const onTouchEnd = (e) => {
    setIsHovered(false);
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 50) handleSwipe("left");
    if (touchStartX - touchEndX < -50) handleSwipe("right");
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
                setTimeout(() => setIsHovered(false), 3000); // Resume auto after 3s
              }}
              className={`w-2 h-2 rounded-full transition-all ${activeGroup === idx ? "bg-primary w-4" : "bg-primary/20 hover:bg-primary/40"}`}
              aria-label={`Show metrics group ${idx + 1}`}
            />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {currentScores.map(({ key, val, label }) => (
          <div key={key} className="tk-glass p-6 animate-fade-in transition-all">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">{label}</p>
            <p className="text-3xl font-display text-primary mb-6">{val}</p>
            <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                        width: `${val}%`, 
                        backgroundColor: val > 75 ? 'var(--tk-accent-sage)' : val > 50 ? '#FFDAB9' : '#E6E6FA'
                    }}
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
