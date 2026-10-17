import Link from "next/link";
import { LayoutDashboard, Home } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-5">
      <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="tk-icon-circle w-20 h-20 mb-6 tk-anim-2">
          <LayoutDashboard className="w-10 h-10 text-accent" />
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-primary mb-3 tk-anim-3">
          Dashboard View Not Found
        </h1>

        <p className="text-muted leading-relaxed mb-8 tk-anim-4">
          This dashboard view doesn&apos;t exist. Let&apos;s get you back to your main skin overview.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full tk-anim-5">
          <Link
            href="/dashboard"
            className="tk-pill-btn tk-btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" /> Main Dashboard
          </Link>
          <Link
            href="/"
            className="tk-pill-btn tk-btn-ghost flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
