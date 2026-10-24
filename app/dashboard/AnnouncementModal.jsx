"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ScanFace, Gift } from "lucide-react";
import AnimatedModal from "@/app/components/AnimatedModal";
import { dismissAnnouncement } from "@/app/lib/announcement-actions";

const POINTS = [
  { icon: CalendarCheck, title: "A personal 30-day plan", text: "Built from your scan, with a target, weekly phases and a reason for every step." },
  { icon: ScanFace, title: "Scan weekly, not daily", text: "Skin changes slowly. Check-in scans on days 7, 14 and 28 show your progress, and your plan adapts." },
  { icon: Gift, title: "New scan allowances", text: "Standard now includes 6 scans a month and Pro 12, up to 5 a day, at lower prices." },
];

/** One-time "what's changed" note for people who used TintKin before the plan-first redesign. */
export default function AnnouncementModal({ id }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const close = (then) => {
    setOpen(false);
    dismissAnnouncement(id);
    if (then) router.push(then);
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={() => close()}
      closeOnBackdrop={false}
      variant="center"
      zIndex={90}
      ariaLabel="What's new in TintKin"
      size="md"
      panelClassName="p-6 pt-7 sm:pt-6"
    >
      <p className="tk-eyebrow">What&apos;s new</p>
      <h3 className="text-xl font-semibold text-primary mt-1">TintKin is now built around improving your skin</h3>
      <p className="text-sm text-muted mt-2">
        Thanks for testing with us. Here is what changed, and what stays the same: your history, streak and milestones are all still here.
      </p>
      <ul className="mt-5 space-y-4">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="tk-icon-circle w-9 h-9 shrink-0"><Icon size={17} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-primary">{title}</span>
              <span className="block text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={() => close()} className="tk-pill-btn tk-btn-ghost px-5 py-3 text-sm">Got it</button>
        <button type="button" onClick={() => close("/routine")} className="tk-pill-btn tk-btn-primary px-5 py-3 text-sm">Show me my plan</button>
      </div>
    </AnimatedModal>
  );
}
