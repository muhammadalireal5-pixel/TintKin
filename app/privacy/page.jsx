import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for TintKin.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-base py-12 px-6 lg:px-20">
      <div className="max-w-3xl mx-auto tk-glass p-8 md:p-12">
        <Link href="/" className="inline-flex items-center text-sm text-sage hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        <h1 className="text-3xl md:text-5xl font-display font-medium text-primary mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted mb-10">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-8 text-primary leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-medium mb-3">1. Introduction</h2>
            <p>At TintKin, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our skincare wellness journal and AI analysis tools.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> We use Firebase to manage authentication. We collect your email address, name, and profile picture provided during sign-up.</li>
              <li><strong>Profile Data:</strong> We collect information you provide during onboarding, including birth date, biological sex, skin type, and skincare goals.</li>
              <li><strong>Facial Images:</strong> When you use our scanning feature, you upload a photo of your face.</li>
              <li><strong>Analysis Data:</strong> We store the numerical scores (e.g., wrinkles, firmness) and AI-generated advice derived from your scans.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">3. How We Process and Retain Images (Zero-Retention Policy)</h2>
            <p>Your privacy and the security of your biometric data are our top priority. We operate a strict minimal-retention policy for images:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>When you upload a photo, it is securely transmitted to Cloudinary for temporary staging and formatting.</li>
              <li>The formatted image is sent to our AI analysis partner (PerfectCorp/YouCam) to generate your skin scores.</li>
              <li><strong>Auto-Deletion:</strong> The moment you take a new scan, your previous image is permanently deleted from Cloudinary via their secure API. We only ever keep the latest image temporarily to allow you to run What-If simulations during that session.</li>
              <li>We do not sell, share, or use your images to train AI models.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">4. Third-Party Services</h2>
            <p>We rely on trusted third-party services to operate TintKin. These services comply with strict data protection standards:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Firebase:</strong> For secure user authentication and account management.</li>
              <li><strong>Cloudinary:</strong> For secure, temporary image staging and processing.</li>
              <li><strong>PerfectCorp (YouCam):</strong> For analyzing skin metrics.</li>
              <li><strong>Alibaba Cloud (Qwen):</strong> For generating personalized, text-based skincare advice based on numerical scores (no images are sent to this service).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">5. Data Deletion and User Rights</h2>
            <p>You own your data. If you wish to delete your account and all associated data (including your journal history and profile data), you can do so at any time by contacting us. Deleting your account will permanently erase your data from our database.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-medium mb-3">6. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy or how your data is handled, please contact us at <a href="mailto:support@tintkin.com" className="text-sage hover:underline">support@tintkin.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
