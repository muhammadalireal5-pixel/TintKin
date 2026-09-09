"use client";

import Link from "next/link";
import { useAuthContext } from "../context/AuthContext";
import { useState } from "react";
import { Settings, User } from "lucide-react";
import { usePathname } from "next/navigation";
import SettingsModal from "./SettingsModal";

export function HeaderAuth() {
  const { user } = useAuthContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/capture", label: "Scan" },
    { href: "/what-if", label: "What-If" },
    { href: "/leaderboard", label: "Board" },
  ];

  if (!user) {
    return (
      <div className="flex gap-1.5 sm:gap-3 items-center flex-shrink-0">
        <Link href="/sign-in" className="tk-pill-btn tk-btn-ghost text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 whitespace-nowrap">
          Sign In
        </Link>
        <Link href="/sign-up" className="tk-pill-btn tk-btn-primary text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 shadow-[0_4px_14px_rgba(44,62,80,0.15)] whitespace-nowrap">
          Start
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Nav links */}
      <nav className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto scrollbar-none flex-1 justify-center min-w-0 px-1 shrink">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                ${isActive
                  ? "text-primary font-semibold bg-black/[0.06]"
                  : "text-muted hover:text-primary hover:bg-black/5"
                }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side: avatar + Settings button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Avatar */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-full p-1 bg-lavender shadow-[0_4px_14px_rgba(230,230,250,0.6)] flex-shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
          aria-label="Open user settings"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white flex items-center justify-center border border-lavender/50">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-primary" />
            )}
          </div>
        </button>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap border border-black/[0.06]"
          aria-label="Open settings"
        >
          <Settings size={14} />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Settings slide-in modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
