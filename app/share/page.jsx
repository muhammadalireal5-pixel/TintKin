import { getLatestData } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import ShareCard from "@/app/dashboard/ShareCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/components/ui/PageHeader";

export const metadata = {
  title: "Share My Skin Card",
  description: "See and share my TintKin skin health card.",
};

export default async function SharePage() {
  const { user, latestAnalyzedSelfie, realAge } = await getLatestData();

  if (!latestAnalyzedSelfie) redirect("/progress");

  const { overallScore, skinAge, scores } = latestAnalyzedSelfie;

  return (
    <div className="tk-container py-5 sm:py-8">
      <div className="max-w-xl mx-auto">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent transition-colors mb-5 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>

        <PageHeader
          eyebrow="TintKin"
          title="My Skin Card"
          subtitle="Download and share your skin health snapshot — watermarked with tintkin.com."
        />

        {/* The card */}
        <ShareCard
          scores={scores}
          overallScore={overallScore}
          skinAge={skinAge}
          realAge={realAge}
          userName={user?.displayName || ""}
        />
      </div>
    </div>
  );
}
