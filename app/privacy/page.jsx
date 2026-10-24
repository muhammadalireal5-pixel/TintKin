import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/components/ui/PageHeader";

export const metadata = {
  title: "Privacy Policy",
  description: "TintKin privacy policy: how we process your photos, who we share data with, and your data rights.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | TintKin",
    description: "TintKin privacy policy: how we process your photos, who we share data with, and your data rights.",
    url: "https://tintkin.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="tk-container max-w-3xl py-6 sm:py-10">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-accent hover:text-accent-deep transition-colors mb-5">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>
      <PageHeader eyebrow="Last Updated: October 24, 2026" title="Privacy Policy" />
      <div className="tk-card p-6 sm:p-10">
        <div className="space-y-8 text-primary leading-relaxed text-[0.95rem]">
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">1. Introduction</h2>
            <p>At TintKin, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our skincare wellness journal, including your personal 30-day skin plan, daily routine and check-in scans.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> We collect your email address, name, and profile picture provided during sign-up (or from Google, if you sign in with Google). Passwords are stored only as salted bcrypt hashes.</li>
              <li><strong>Profile Data:</strong> We collect information you provide during onboarding, including birth date, gender, skin type, and skincare goals.</li>
              <li><strong>Facial Images:</strong> When you take a scan (your starting selfie during sign-up, a plan check-in, or any extra scan), you upload a photo of your face.</li>
              <li><strong>Analysis Data:</strong> We store the numerical scores (e.g., wrinkles, firmness) and AI-generated advice derived from your scans.</li>
              <li><strong>Plan and Routine Data:</strong> We store your 30-day skin plan (your focus areas, targets and steps, and any changes made to it after check-ins), which routine steps you tick off each day, your check-in results and the reports generated from them, and your care streak and milestones.</li>
              <li><strong>Notification Data:</strong> If you turn on reminders, we store a push subscription for each browser or device you enable them on, and your reminder preferences and time zone, so we can send gentle morning and evening nudges. You can turn reminders off in Settings at any time.</li>
              <li><strong>Payment Data:</strong> If you purchase credits, our payment processor (Polar, see below) handles your payment details directly &mdash; we never see or store your card number. We retain only the order/credit records needed to apply your purchase and handle refunds.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">3. How We Process and Retain Images</h2>
            <p>Your privacy and the security of your biometric data are a top priority. Here is exactly how your photos are handled:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>When you upload a photo, it is securely transmitted to Cloudinary (using private, authenticated delivery, not a public link) for staging and formatting.</li>
              <li>The formatted image is sent to our analysis partner (PerfectCorp/YouCam) to generate your skin scores. Your plan is built from those scores, not from the photo itself.</li>
              <li><strong>Your choice &mdash; store or delete:</strong> In Settings, you can choose what happens to your photo after each scan. If you choose &ldquo;delete,&rdquo; it is permanently removed immediately after analysis. If you choose &ldquo;store&rdquo; (the default), your most recent photo is kept &mdash; to let you run What-If simulations and see your own photo in your journal &mdash; until you take your <em>next</em> scan, at which point the previous photo is automatically and permanently deleted. Depending on how often you scan, this could be anywhere from the same day to several weeks.</li>
              <li>We do not sell, share, or use your images to train AI models.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">4. Third-Party Services</h2>
            <p>We rely on trusted third-party services to operate TintKin. These services comply with strict data protection standards:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>MongoDB Atlas:</strong> For storing your account, profile and analysis data.</li>
              <li><strong>Google (optional):</strong> For sign-in if you choose &ldquo;Sign in with Google&rdquo;.</li>
              <li><strong>Cloudinary:</strong> For secure image staging and processing.</li>
              <li><strong>PerfectCorp (YouCam):</strong> For analyzing skin metrics.</li>
              <li><strong>Alibaba Cloud (Qwen):</strong> For writing your personalised plan, routine and check-in adjustments. It receives your numerical scores, your plan progress and routine consistency, and basic profile details (age, sex, skin type and goals) (no images, name or email are sent to this service). This service is based outside your country.</li>
              <li><strong>Resend:</strong> For sending account emails (password reset, email verification, and data export emails if you request one).</li>
              <li><strong>Sentry:</strong> For error monitoring, so we can detect and fix bugs. Sentry data is automatically filtered to remove emails, images, and other personal details before it is sent.</li>
              <li><strong>Polar:</strong> For processing credit purchases and refunds, if you buy credits in the shop.</li>
              <li><strong>Vercel:</strong> For hosting the application.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">5. Cookies and Sessions</h2>
            <p>We use a single, essential session cookie to keep you signed in; it contains no data beyond your account ID and session status. If you sign in with Google, Google may also set its own cookies during that sign-in step. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">6. Data Deletion and User Rights</h2>
            <p>You own your data. From your account Settings, you can, at any time and without contacting anyone: download a copy of your data, have a copy emailed to you, or permanently delete your account and all associated data (journal history, photos, and profile data). You&rsquo;re also welcome to reach out to us directly with any request &mdash; see Contact Us below.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-accent mb-3">7. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy or how your data is handled, please contact us at <a href="mailto:muhammad0alire@gmail.com" className="text-accent hover:underline">muhammad0alire@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
