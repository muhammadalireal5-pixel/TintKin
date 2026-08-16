"use client";

import Link from "next/link";
import { useAuthContext } from "../context/AuthContext";
import { useState } from "react";
import { LogOut, User } from "lucide-react";

export function HeaderAuth() {
  const { user, signOutUser } = useAuthContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
      <nav className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto scrollbar-none flex-1 justify-center min-w-0 px-1 shrink">
        <Link href="/dashboard" prefetch={false} className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">Dashboard</Link>
        <Link href="/capture" prefetch={false} className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">Scan</Link>
        <Link href="/what-if" prefetch={false} className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">What-If</Link>
      </nav>

      <div className="flex gap-1.5 sm:gap-3 items-center flex-shrink-0 relative">
        <div className="rounded-full p-1 bg-lavender shadow-[0_4px_14px_rgba(230,230,250,0.6)] flex-shrink-0">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center border border-lavender/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-primary" />
            )}
          </button>
        </div>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
            <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button 
                onClick={async () => {
                  setDropdownOpen(false);
                  await signOutUser();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
