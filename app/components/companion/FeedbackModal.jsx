"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Star, Send, Check, X } from "lucide-react";
import AnimatedModal from "@/app/components/AnimatedModal";
import { submitFeedback } from "@/app/lib/feedback-actions";

export const OPEN_FEEDBACK_EVENT = "tk-open-feedback";
export const openFeedback = () => window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT));

const TYPES = [
  { id: "review", label: "Review" },
  { id: "feedback", label: "Feedback" },
  { id: "idea", label: "Idea" },
  { id: "bug", label: "Bug" },
  { id: "complaint", label: "Complaint" },
  { id: "other", label: "Other" },
];

const MAX = 2000;

/**
 * Review / feedback / complaint form. Opens on a double-tap of the companion,
 * from the companion's bubble, or from Profile. Messages go to the admin
 * portal only. Mounted once by AppShell for signed-in users.
 */
export default function FeedbackModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("feedback");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  useEffect(() => {
    const onOpen = () => {
      setStatus("idle");
      setError("");
      setOpen(true);
    };
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
  }, []);

  // Close automatically a moment after a successful send.
  useEffect(() => {
    if (status !== "sent") return undefined;
    const t = window.setTimeout(() => {
      setOpen(false);
      setMessage("");
      setRating(0);
      setType("feedback");
    }, 2200);
    return () => window.clearTimeout(t);
  }, [status]);

  const send = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const res = await submitFeedback({
      type,
      rating: rating || null,
      message,
      page: pathname,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      theme: document.documentElement.dataset.theme || "rose",
    });
    if (res?.success) {
      setStatus("sent");
    } else {
      setStatus("idle");
      setError(res?.error || "Couldn't send that. Please try again.");
    }
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={() => setOpen(false)}
      size="md"
      zIndex={120}
      ariaLabel="Send feedback"
      panelClassName="p-5 sm:p-6"
    >
      {status === "sent" ? (
        <div className="py-8 text-center">
          <span className="tk-icon-circle w-14 h-14 mx-auto bg-success-soft text-success">
            <Check size={26} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-primary">Thank you!</h2>
          <p className="mt-1 text-sm text-muted">Kin delivered it to the team. We read every message.</p>
        </div>
      ) : (
        <form onSubmit={send}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-primary">Tell us what you think</h2>
              <p className="text-sm text-muted mt-0.5">A review, an idea, a bug or a complaint. All welcome.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-muted hover:bg-blush"
            >
              <X size={18} />
            </button>
          </div>

          <fieldset className="mt-4">
            <legend className="sr-only">Type</legend>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={type === t.id}
                  onClick={() => setType(t.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors ${
                    type === t.id ? "bg-accent text-white border-accent" : "bg-surface text-primary border-line hover:bg-blush"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-muted">Rating (optional)</span>
            <div role="radiogroup" aria-label="Rating" className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className="p-0.5"
                >
                  <Star size={24} className={n <= rating ? "fill-accent text-accent" : "text-faint"} />
                </button>
              ))}
            </div>
          </div>

          <label className="block mt-4">
            <span className="sr-only">Your message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX}
              rows={5}
              required
              placeholder="What's on your mind?"
              className="tk-input resize-none"
            />
          </label>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Only the TintKin team sees this, with your email and the page you&apos;re on so we can follow up.</span>
            <span className="tabular-nums shrink-0 ml-3">{message.length}/{MAX}</span>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending" || message.trim().length < 3}
            className="tk-pill-btn tk-btn-primary w-full mt-5 py-3"
          >
            <Send size={16} /> {status === "sending" ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </AnimatedModal>
  );
}
