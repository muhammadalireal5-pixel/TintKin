import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service and user agreement for TintKin's AI skin wellness journal.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | TintKin",
    description: "Terms of Service and user agreement for TintKin's AI skin wellness journal.",
    url: "https://tintkin.com/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-base py-12 px-6 lg:px-20">
      <div className="max-w-3xl mx-auto tk-glass p-8 md:p-12">
        <Link href="/" className="inline-flex items-center text-sm text-sage hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        <h1 className="text-3xl md:text-5xl font-display font-medium text-primary mb-6">Terms of Service</h1>
        <p className="text-sm text-muted mb-10">Last Updated: October 10, 2026</p>

        <div className="space-y-8 text-primary leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-medium mb-3">1. Welcome to TintKin</h2>
            <p>Welcome to TintKin. By using our website and services (&quot;Services&quot;), you agree to these Terms of Service. Please read them carefully.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">2. Description of Service</h2>
            <p>TintKin is an AI-powered skincare wellness journal that provides insights, skin analysis, and simulations based on photos you upload. <strong>TintKin is not a medical device or service.</strong> The insights provided are for informational and cosmetic purposes only and do not constitute medical advice, diagnosis, or treatment.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">3. Image Processing &amp; Retention</h2>
            <p>When you use our scanning feature, you upload a photo of your face. We process this image using secure third-party services (Cloudinary for staging, PerfectCorp/YouCam for analysis) to generate your skin insights. In Settings, you choose whether your photo is deleted immediately after each scan, or kept so you can revisit it and run What-If simulations until your next scan replaces it &mdash; see our Privacy Policy for the full detail. Either way, we do not keep your facial images indefinitely: every scan automatically and permanently deletes whichever photo came before it. The numerical scores and AI advice are retained in your journal history regardless of your photo choice.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">4. User Responsibilities</h2>
            <p>You must be at least 18 years old to use TintKin. You are responsible for maintaining the security of your account and ensuring that you have the right to upload any photos provided to the Service. You agree not to upload inappropriate, offensive, or illegal content.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">5. Purchases and Credits</h2>
            <p>TintKin may offer optional credit packs for additional scans or simulations, processed through our payment partner, Polar. All purchases are subject to Polar&rsquo;s own terms for handling your payment details. Refund requests can be made by contacting us at the email below.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">6. Intellectual Property</h2>
            <p>All content, design, and software associated with TintKin are the exclusive property of TintKin. You may use our Services for personal, non-commercial use only.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">7. Limitation of Liability</h2>
            <p>TintKin is provided &quot;as is&quot; without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the Services or reliance on any insights provided.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">8. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at <a href="mailto:support@tintkin.com" className="text-sage hover:underline">support@tintkin.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
