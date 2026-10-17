import Link from "next/link";
import Wordmark from "@/app/components/ui/Wordmark";

const NAV = [
  { key: "users", href: "/admin", label: "Users" },
  { key: "feedback", href: "/admin/feedback", label: "Feedback" },
  { key: "shop", href: "/admin/shop", label: "Shop" },
];

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { adminLogout } = await import("@/app/lib/admin-auth");
        await adminLogout();
        const { redirect } = await import("next/navigation");
        redirect("/admin/login");
      }}
    >
      <button
        type="submit"
        className="px-3.5 py-2 rounded-xl border border-line text-[13px] font-medium text-primary hover:bg-blush/60 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}

function NavPills({ current, className = "" }) {
  return (
    <nav aria-label="Admin sections" className={className}>
      {NAV.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={current === item.key ? "page" : undefined}
          className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
            current === item.key ? "bg-cocoa text-white" : "text-primary hover:bg-blush/70"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Admin-only chrome (the portal is deliberately separate from the main app).
 * One row on desktop; on a phone the section tabs drop to a scrollable row
 * under the logo so nothing overflows.
 */
export default function AdminHeader({ current, email }) {
  return (
    <header className="sticky top-0 z-50 bg-base/95 backdrop-blur border-b border-line">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Wordmark asLink={false} className="text-3xl" />
            <span className="px-2 py-0.5 rounded-full bg-blush text-[11px] font-semibold text-muted">Admin</span>
            {email && <span className="hidden lg:inline text-xs text-muted truncate">{email}</span>}
          </div>

          <NavPills current={current} className="hidden sm:flex items-center gap-1" />

          <LogoutButton />
        </div>
        <NavPills current={current} className="sm:hidden flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-none" />
      </div>
    </header>
  );
}
