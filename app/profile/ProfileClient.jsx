"use client";

import Link from "next/link";
import {
  ChevronRight,
  Settings,
  ClipboardList,
  Crown,
  Sparkles,
  FileText,
  Trophy,
  ShoppingBag,
  History,
  Share2,
  Shield,
  ScrollText,
  Mail,
  LogOut,
  MapPin,
  Cat,
  MessageSquareHeart,
} from "lucide-react";
import { useAuthContext } from "@/app/context/AuthContext";
import { useSettings } from "@/app/context/SettingsContext";
import UserAvatar from "@/app/components/UserAvatar";
import ThemeToggle from "@/app/components/ThemeToggle";
import { updateCompanionPrefs, useCompanionPrefs } from "@/app/components/companion/store";
import { openFeedback } from "@/app/components/companion/FeedbackModal";
import { TIERS, TIER_NAMES } from "@/lib/constants/tiers";

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Row({ icon: Icon, label, sub, href, onClick, trailing, external }) {
  const inner = (
    <>
      <span className="tk-icon-circle w-9 h-9"><Icon size={17} /></span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-medium text-primary">{label}</span>
        {sub && <span className="block text-xs text-muted truncate">{sub}</span>}
      </span>
      {trailing}
      <ChevronRight size={17} className="text-faint shrink-0" />
    </>
  );
  const cls = "flex items-center gap-3 w-full px-4 py-3 hover:bg-blush/50 transition-colors";
  if (href) {
    return external
      ? <a href={href} className={cls}>{inner}</a>
      : <Link href={href} className={cls}>{inner}</Link>;
  }
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function Group({ title, children }) {
  return (
    <section>
      <h2 className="tk-eyebrow px-1 mb-2">{title}</h2>
      <div className="tk-card overflow-hidden divide-y divide-line">{children}</div>
    </section>
  );
}

export default function ProfileClient({ profile }) {
  const { user, signOutUser } = useAuthContext();
  const { openSettings } = useSettings();
  const kin = useCompanionPrefs();

  const name = profile?.displayName || user?.displayName || "Your account";
  const email = profile?.email || user?.email || "";
  const tier = profile?.tier || TIERS.FREE;
  const tierName = TIER_NAMES[tier] || "Free";
  const place = [profile?.location?.city, profile?.location?.country].filter(Boolean).join(", ");
  const credits = profile?.creditBalance || 0;

  return (
    <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-6 items-start">
      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <section className="tk-card p-6 flex flex-col items-center text-center">
          <span className="w-24 h-24 rounded-full overflow-hidden bg-accent-soft border-4 border-white shadow-[0_8px_24px_-10px_rgb(var(--tk-ink-rgb)/0.4)] flex items-center justify-center">
            <UserAvatar photoURL={profile?.photoURL || user?.photoURL} name={name} email={email} className="text-3xl" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-primary break-words max-w-full">{name}</h1>
          {email && <p className="text-sm text-muted break-all">{email}</p>}
          {place && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><MapPin size={12} /> {place}</p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="tk-chip"><Crown size={12} /> {tierName} plan</span>
            {credits > 0 && <span className="tk-chip">{credits} {credits === 1 ? "credit" : "credits"}</span>}
            {profile?.skinType && <span className="tk-chip capitalize">{String(profile.skinType)} skin</span>}
          </div>
          {tier === TIERS.FREE && (
            <Link href="/pricing" className="tk-pill-btn tk-btn-primary mt-5 w-full py-3">
              Upgrade your plan
            </Link>
          )}
        </section>

        <button
          type="button"
          onClick={() => signOutUser()}
          className="tk-pill-btn w-full py-3 bg-danger-soft text-danger hover:brightness-95"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <Group title="Account">
          <Row icon={ClipboardList} label="Skin profile" sub={profile?.hasSkinProfile ? "Update your answers and rebuild your plan" : "Answer a few new questions for a better plan"} href="/profile/skin" />
          <Row icon={Settings} label="Settings & preferences" sub="Profile, notifications, privacy, data" onClick={openSettings} />
          <Row icon={Crown} label="Plans & billing" sub={`Current plan: ${tierName}`} href="/pricing" />
        </Group>

        <section>
          <h2 className="tk-eyebrow px-1 mb-2">Appearance</h2>
          <div className="tk-card p-4">
            <ThemeToggle />
            <div className="mt-4 pt-4 border-t border-line flex items-center gap-3">
              <span className="tk-icon-circle w-9 h-9"><Cat size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-primary">Show Kin on my screens</span>
                <span className="block text-xs text-muted">Drag Kin anywhere. Tap for quick links, double tap for feedback.</span>
              </span>
              <Switch label="Show Kin" checked={kin.enabled} onChange={(v) => updateCompanionPrefs({ enabled: v })} />
            </div>
            {kin.enabled && (
              <>
                <div className="mt-4 pt-4 border-t border-line">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-primary">Quiet hours</span>
                      <span className="block text-xs text-muted">Kin won&apos;t greet or remind you during this window.</span>
                    </span>
                    <Switch
                      label="Quiet hours"
                      checked={kin.quietHours.enabled}
                      onChange={(v) => updateCompanionPrefs((p) => ({ quietHours: { ...p.quietHours, enabled: v } }))}
                    />
                  </div>
                  {kin.quietHours.enabled && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                      <input
                        type="time"
                        aria-label="Quiet hours start"
                        value={kin.quietHours.start}
                        onChange={(e) => updateCompanionPrefs((p) => ({ quietHours: { ...p.quietHours, start: e.target.value } }))}
                        className="tk-input !w-auto py-2"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        aria-label="Quiet hours end"
                        value={kin.quietHours.end}
                        onChange={(e) => updateCompanionPrefs((p) => ({ quietHours: { ...p.quietHours, end: e.target.value } }))}
                        className="tk-input !w-auto py-2"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => updateCompanionPrefs({ enabled: true, pos: null, tours: {}, seen: {} })}
              className="mt-3 text-sm font-semibold text-accent hover:text-accent-deep"
            >
              Replay the walkthrough and reset Kin&apos;s position
            </button>
          </div>
        </section>

        <Group title="Explore">
          <Row icon={Sparkles} label="What-If simulator" sub="Preview your skin 6 months ahead" href="/what-if" />
          <Row icon={FileText} label="Skin reports" sub="AI summaries of your progress" href="/reports" />
          <Row icon={Trophy} label="Leaderboard" sub="See how you rank" href="/leaderboard" />
          <Row icon={ShoppingBag} label="Shop" sub="Curated products" href="/shop" />
        </Group>

        <Group title="Your data">
          <Row icon={History} label="Weekly history" href="/history" />
          <Row icon={Share2} label="Share your score card" href="/share" />
        </Group>

        <Group title="About">
          <Row icon={Shield} label="Privacy policy" href="/privacy" />
          <Row icon={ScrollText} label="Terms of service" href="/terms" />
          <Row icon={MessageSquareHeart} label="Send feedback" sub="Reviews, ideas, bugs, complaints" onClick={openFeedback} />
          <Row icon={Mail} label="Contact us" href="mailto:muhammad0alire@gmail.com" external />
        </Group>
      </div>
    </div>
  );
}
