"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Camera, Settings } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { SettingsContext } from "../context/SettingsContext";
import { useReportStatus } from "./reportStatus";
import { useToast } from "./ToastProvider";
import SettingsModal from "./SettingsModal";
import UserAvatar from "./UserAvatar";
import Wordmark from "./ui/Wordmark";
import ThemeToggle from "./ThemeToggle";
import PageTransition from "./PageTransition";
import Companion from "./companion/Companion";
import FeedbackModal from "./companion/FeedbackModal";
import { TAB_ITEMS, SIDEBAR_GROUPS, isActivePath } from "./nav-items";
import { usePageLoading } from "./page-loading";

/** True once the account and the current page's data have both arrived (see page-loading.js). */
function useChromeReady() {
  const { loading } = useAuthContext();
  const pageLoading = usePageLoading();
  return !loading && !pageLoading;
}

/** The logo, or a placeholder of the same size until the page has loaded. */
function ChromeWordmark({ ready, className, href }) {
  if (!ready) return <span className={`block rounded-full bg-blush animate-pulse ${className} aspect-[3/1]`} aria-hidden="true" />;
  return <Wordmark href={href} className={className} />;
}

function Avatar({ user, size = "w-9 h-9", loading = false }) {
  // A skeleton until the account has loaded, so the avatar never flashes a placeholder initial.
  if (loading) return <span className={`${size} rounded-full bg-blush animate-pulse shrink-0 block`} aria-hidden="true" />;
  return (
    <span className={`${size} rounded-full overflow-hidden bg-accent-soft border border-line flex items-center justify-center shrink-0`}>
      <UserAvatar photoURL={user?.photoURL} name={user?.displayName} email={user?.email} className="text-sm" />
    </span>
  );
}

function ReportBell({ ready }) {
  return (
    <Link
      href="/reports"
      aria-label={ready ? "Reports — a new report is ready" : "Reports"}
      className="relative w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-primary hover:bg-accent-soft transition-colors"
    >
      <Bell size={18} />
      {ready && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white tk-text-micro font-bold flex items-center justify-center ring-2 ring-base">
          1
        </span>
      )}
    </Link>
  );
}

function PublicActions() {
  const { loading } = useAuthContext();
  if (loading) {
    return <div className="h-10 w-40 rounded-full bg-blush animate-pulse" aria-hidden="true" />;
  }
  return (
    <div className="flex gap-2 sm:gap-3 items-center shrink-0">
      <Link href="/sign-in" className="tk-pill-btn tk-btn-ghost text-sm px-4 sm:px-5 py-2 sm:py-2.5 whitespace-nowrap">
        Sign in
      </Link>
      <Link href="/sign-up" className="tk-pill-btn tk-btn-primary text-sm px-4 sm:px-5 py-2 sm:py-2.5 whitespace-nowrap">
        Get started
      </Link>
    </div>
  );
}

function PublicShell({ children }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-base/90 backdrop-blur border-b border-line shrink-0">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Wordmark className="h-9 sm:h-11" />
          <PublicActions />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="mt-auto border-t border-line bg-base shrink-0">
        <div className="max-w-7xl mx-auto px-5 py-8 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark className="h-8" asLink={false} />
            <span className="text-sm text-muted">© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-muted hover:text-primary transition-colors">Terms of Service</Link>
            <a href="mailto:muhammad0alire@gmail.com" className="text-sm text-muted hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}

function Sidebar({ user, reportReady, onOpenSettings }) {
  const ready = useChromeReady();
  const pathname = usePathname();
  return (
    <aside
      data-tour="nav"
      className="hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-surface border-r border-line px-5 pt-7 pb-5 overflow-y-auto"
      style={{ width: "var(--tk-sidebar-w)" }}
      aria-label="Primary"
    >
      <div className="px-2">
        <ChromeWordmark ready={ready} href="/dashboard" className="h-12" />
      </div>

      <Link href="/capture" className="tk-pill-btn tk-btn-primary mt-7 w-full py-3.5 text-[15px]">
        <Camera size={18} /> Progress scan
      </Link>

      <nav className="mt-6 flex-1 flex flex-col gap-5">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="tk-eyebrow px-3 mb-1.5">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActivePath(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                        active
                          ? "bg-accent-soft text-accent-deep"
                          : "text-primary/80 hover:bg-blush/70 hover:text-primary"
                      }`}
                    >
                      <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
                      <span className="flex-1">{label}</span>
                      {badge === "report" && reportReady && (
                        <span className="w-2 h-2 rounded-full bg-accent" aria-label="Report ready" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-base/60 p-3 text-left hover:bg-blush/60 transition-colors"
        aria-label="Open settings"
      >
        <Avatar user={user} size="w-10 h-10" loading={!ready} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-primary truncate">{user?.displayName || "Your account"}</span>
          <span className="block text-xs text-muted truncate">{user?.email}</span>
        </span>
        <Settings size={16} className="text-muted shrink-0" />
      </button>
      <ThemeToggle variant="compact" className="mt-4 self-center" />
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted">
        <Link href="/privacy" className="hover:text-primary">Privacy</Link>
        <Link href="/terms" className="hover:text-primary">Terms</Link>
      </div>
    </aside>
  );
}

function TopBar({ user, reportReady, focus }) {
  const ready = useChromeReady();
  return (
    <header className="sticky top-0 z-30 bg-base/85 backdrop-blur-md md:bg-transparent md:backdrop-blur-none">
      <div className="h-16 px-5 md:px-8 flex items-center justify-between gap-3">
        <div className={focus ? "" : "md:hidden"}>
          <ChromeWordmark ready={ready} href="/dashboard" className="h-10" />
        </div>
        {!focus && (
          <div className="flex items-center gap-2.5 ml-auto">
            {ready ? (
              <>
                <ReportBell ready={reportReady} />
                <Link href="/profile" aria-label="Profile" className="rounded-full hover:opacity-85 transition-opacity">
                  <Avatar user={user} size="w-10 h-10" />
                </Link>
              </>
            ) : (
              <>
                <span className="w-10 h-10 rounded-full bg-blush animate-pulse" aria-hidden="true" />
                <span className="w-10 h-10 rounded-full bg-blush animate-pulse" aria-hidden="true" />
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const left = TAB_ITEMS.slice(0, 2);
  const right = TAB_ITEMS.slice(2);
  const scanActive = isActivePath(pathname, "/capture");

  const renderTab = ({ href, label, icon: Icon }) => {
    const active = isActivePath(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        prefetch
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 min-w-0"
      >
        <motion.span whileTap={{ scale: 0.88 }} className={`flex flex-col items-center gap-1 ${active ? "text-accent" : "text-muted"}`}>
          <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
          <span className={`tk-text-micro leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
        </motion.span>
      </Link>
    );
  };

  return (
    <nav
      data-tour="nav"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface rounded-t-[1.75rem] border-t border-line shadow-[0_-10px_28px_-14px_rgb(var(--tk-ink-rgb)/0.25)] pb-safe"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 items-end px-2">
        {left.map(renderTab)}
        <div className="flex justify-center">
          <Link
            href="/capture"
            prefetch
            aria-label="Progress scan"
            aria-current={scanActive ? "page" : undefined}
            className="-mt-6 mb-1"
          >
            <motion.span whileTap={{ scale: 0.92 }} className="tk-fab">
              <Camera size={24} />
            </motion.span>
          </Link>
        </div>
        {right.map(renderTab)}
      </div>
    </nav>
  );
}

export default function AppShell({ initialAuthed = false, children }) {
  const pathname = usePathname();
  const { user, loading } = useAuthContext();
  const { showToast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Until the session resolves, trust the server's cookie check so the
  // sidebar doesn't pop in (and shove the page 264px) after hydration.
  const authed = loading ? initialAuthed : Boolean(user);
  const reportStatus = useReportStatus(authed && !loading);
  const reportReady = Boolean(reportStatus?.ready);

  // /api/billing-portal redirects back here with this on a Polar API failure
  // (e.g. the access token is missing the customer_sessions:write scope)
  // instead of leaving the user on a crashed/blank page. Reads window.location
  // directly (not useSearchParams()) so this doesn't force every page into a
  // Suspense boundary.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "billing_portal_failed") {
      showToast({ type: "error", title: "Couldn't open billing", message: "Please try again in a moment." });
      // Reacting to the initial URL (an external system) once on mount, not a
      // derived render value; there's no render-time alternative here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettingsOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settingsApi = useMemo(() => ({ openSettings: () => setSettingsOpen(true) }), []);

  // Admin has its own chrome.
  if (pathname.startsWith("/admin")) return <>{children}</>;

  if (!authed) {
    return (
      <SettingsContext.Provider value={settingsApi}>
        <PublicShell>{children}</PublicShell>
      </SettingsContext.Provider>
    );
  }

  // Onboarding and the first-scan welcome are focused flows: logo only, no
  // navigation to leave through.
  const focus = pathname.startsWith("/onboarding") || pathname.startsWith("/welcome");

  return (
    <SettingsContext.Provider value={settingsApi}>
      {!focus && <Sidebar user={user} reportReady={reportReady} onOpenSettings={settingsApi.openSettings} />}
      <div className={`flex-1 flex flex-col min-w-0 ${focus ? "" : "tk-shell-main"}`}>
        <TopBar user={user} reportReady={reportReady} focus={focus} />
        <main className={`flex-1 flex flex-col w-full ${focus ? "" : "pb-safe-nav"}`}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      {!focus && <BottomNav />}
      <Companion />
      <FeedbackModal />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SettingsContext.Provider>
  );
}
