import {
  House,
  ListChecks,
  TrendingUp,
  UserRound,
  Sparkles,
  FileText,
  Trophy,
  ShoppingBag,
  Crown,
} from "lucide-react";

// Phone bottom nav: four tabs around the centre Scan button (see AppShell).
export const TAB_ITEMS = [
  { href: "/dashboard", label: "Today", icon: House },
  { href: "/routine", label: "Plan", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: UserRound },
];

// Desktop sidebar: everything, grouped. Phone reaches the "Explore" group from
// the Today page and the Profile menu instead of the tab bar.
export const SIDEBAR_GROUPS = [
  {
    label: "Your skin",
    items: [
      { href: "/dashboard", label: "Today", icon: House },
      { href: "/routine", label: "Plan", icon: ListChecks },
      { href: "/progress", label: "Progress", icon: TrendingUp },
    ],
  },
  {
    label: "Explore",
    items: [
      { href: "/what-if", label: "What-If", icon: Sparkles },
      { href: "/reports", label: "Reports", icon: FileText, badge: "report" },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/shop", label: "Shop", icon: ShoppingBag },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/pricing", label: "Plans", icon: Crown },
      { href: "/profile", label: "Profile", icon: UserRound },
    ],
  },
];

// /history is a drill-down of Progress, so it keeps that tab lit.
const ALIASES = { "/history": "/progress", "/share": "/progress" };

export function isActivePath(pathname, href) {
  const p = ALIASES[pathname] || pathname;
  return p === href || p.startsWith(`${href}/`);
}
