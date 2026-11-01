import Link from "next/link";
import { LayoutDashboard, Users, MessageSquareHeart, ShoppingBag, LogOut, Eye, ExternalLink } from "lucide-react";

const GROUPS = [
  { label: "Studio", items: [{ key: "overview", href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "People",
    items: [
      { key: "users", href: "/admin/users", label: "Users", icon: Users },
      { key: "feedback", href: "/admin/feedback", label: "Feedback", icon: MessageSquareHeart },
    ],
  },
  { label: "Commerce", items: [{ key: "shop", href: "/admin/shop", label: "Credit shop", icon: ShoppingBag }] },
];

const TITLES = { overview: "Overview", users: "Users", feedback: "Feedback", shop: "Credit shop" };

function SignOut() {
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
      <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-muted hover:text-primary hover:bg-blush/60 transition-colors">
        <LogOut size={14} aria-hidden="true" /> Sign out
      </button>
    </form>
  );
}

function NavLink({ item, current, compact = false }) {
  const Icon = item.icon;
  const on = current === item.key;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg text-[13px] transition-colors whitespace-nowrap ${compact ? "px-3 py-1.5" : "px-3 py-2"} ${
        on ? "bg-paper text-primary font-semibold ring-1 ring-accent/60 shadow-[0_1px_0_rgb(var(--tk-ink-rgb)/0.04)]" : "text-muted hover:text-primary hover:bg-blush/50"
      }`}
    >
      <Icon size={14} aria-hidden="true" className={on ? "text-accent" : ""} />
      {item.label}
    </Link>
  );
}

export function AdminLabel({ children, className = "" }) {
  return <p className={`font-mono text-[10px] uppercase tracking-[0.14em] text-muted ${className}`}>{children}</p>;
}

export default function AdminShell({ current, session, children, wide = true }) {
  const viewer = session?.role === "viewer";
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] bg-base">
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen border-r border-line px-3 py-5">
        <div className="px-2 mb-6">
          <p className="tk-wordmark text-xl">tintkin</p>
          <AdminLabel className="mt-1">Admin studio</AdminLabel>
        </div>
        <nav aria-label="Admin sections" className="flex-1 flex flex-col gap-5 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <AdminLabel className="px-3 mb-1.5">{g.label}</AdminLabel>
              <div className="flex flex-col gap-0.5">
                {g.items.map((item) => <NavLink key={item.key} item={item} current={current} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-line pt-3 flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-muted hover:text-primary hover:bg-blush/60">
            <ExternalLink size={14} aria-hidden="true" /> View site
          </Link>
          <SignOut />
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-base/95 backdrop-blur border-b border-line">
          <div className="h-12 px-4 sm:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="lg:hidden tk-wordmark text-lg">tintkin</span>
              <AdminLabel className="truncate">
                Studio <span className="text-faint">/</span> <span className="text-primary">{TITLES[current] ?? "Admin"}</span>
              </AdminLabel>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {viewer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft text-warn px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]">
                  <Eye size={11} aria-hidden="true" /> Read-only
                </span>
              )}
              <span className="hidden sm:inline text-xs text-muted truncate max-w-[14rem]">{session?.email}</span>
              <div className="lg:hidden"><SignOut /></div>
            </div>
          </div>
          <nav aria-label="Admin sections" className="lg:hidden flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
            {GROUPS.flatMap((g) => g.items).map((item) => <NavLink key={item.key} item={item} current={current} compact />)}
          </nav>
        </header>
        <main className={`flex-1 w-full mx-auto px-4 sm:px-8 py-6 ${wide ? "max-w-[1400px]" : "max-w-[1100px]"}`}>{children}</main>
      </div>
    </div>
  );
}
