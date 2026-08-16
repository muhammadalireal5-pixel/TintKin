import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for TintKin.",
};

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-base py-12 px-6 lg:px-20">
      <div className="max-w-3xl mx-auto tk-glass p-8 md:p-12">
        <Link href="/" className="inline-flex items-center text-sm text-sage hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        <h1 className="text-3xl md:text-5xl font-display font-medium text-primary mb-6">Terms of Service</h1>
        <p className="text-sm text-muted mb-10">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-8 text-primary leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-medium mb-3">1. Welcome to TintKin</h2>
            <p>Welcome to TintKin. By using our website and services ("Services"), you agree to these Terms of Service. Please read them carefully.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">2. Description of Service</h2>
            <p>TintKin is an AI-powered skincare wellness journal that provides insights, skin analysis, and simulations based on photos you upload. <strong>TintKin is not a medical device or service.</strong> The insights provided are for informational and cosmetic purposes only and do not constitute medical advice, diagnosis, or treatment.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">3. Image Processing & Retention</h2>
            <p>When you use our scanning feature, you upload a photo of your face. We temporarily process this image using secure third-party services (Cloudinary for staging, PerfectCorp/YouCam for analysis) to generate your skin insights. <strong>We do not permanently retain your facial images.</strong> Every time you take a new scan, your previous image is automatically and permanently deleted from our servers and third-party storage. Only the numerical scores and AI advice are retained in your journal history.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">4. User Responsibilities</h2>
            <p>You must be at least 18 years old to use TintKin. You are responsible for maintaining the security of your account and ensuring that you have the right to upload any photos provided to the Service. You agree not to upload inappropriate, offensive, or illegal content.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">5. Intellectual Property</h2>
            <p>All content, design, and software associated with TintKin are the exclusive property of TintKin. You may use our Services for personal, non-commercial use only.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">6. Limitation of Liability</h2>
            <p>TintKin is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the Services or reliance on any insights provided.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">7. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at <a href="mailto:support@tintkin.com" className="text-sage hover:underline">support@tintkin.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
