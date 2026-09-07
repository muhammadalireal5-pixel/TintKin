"use client";

import { Award } from "lucide-react";

export default function TrophyCase({ badges }) {
  return (
    <div className="tk-glass p-8 flex flex-col h-full">
      <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-6">Trophy Case</p>
      {(!badges || badges.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Award className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted">Keep scanning to earn your first milestone badge!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {badges.map((badge, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
              <Award className="w-8 h-8 text-orange-500 mb-2" />
              <span className="text-xs font-semibold text-orange-700 leading-tight">{badge}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
