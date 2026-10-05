"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Camera, Sparkles, FileText, Trophy } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { useReportStatus } from "./reportStatus";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/capture", label: "Scan", icon: Camera },
  { href: "/what-if", label: "What-If", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/leaderboard", label: "Board", icon: Trophy },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthContext();
  const reportStatus = useReportStatus(Boolean(user));

  if (!user) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FDFBF7] border-t border-[rgba(44,62,80,0.08)] shadow-[0_-4px_16px_rgba(44,62,80,0.04)] pb-safe"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const showBadge = href === "/reports" && reportStatus?.ready;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0"
            >
              <motion.span
                whileTap={{ scale: 0.88 }}
                className={`flex flex-col items-center gap-0.5 ${isActive ? "text-primary" : "text-muted"}`}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-[#D9534F] ring-2 ring-[#FDFBF7]" aria-label="Report ready" />
                  )}
                </span>
                <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
                  {label}
                </span>
              </motion.span>
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-sage"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
