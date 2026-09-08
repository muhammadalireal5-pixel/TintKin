import { getLatestData } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import ShareCard from "@/app/dashboard/ShareCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Share My Skin Card",
  description: "See and share my TintKin skin health card.",
};

export default async function SharePage() {
  const { latestSelfie, latestAnalyzedSelfie, allSelfies, realAge } = await getLatestData();

  if (!latestSelfie) redirect("/capture");

  const sourceData = latestAnalyzedSelfie || latestSelfie;
  const { overallScore, skinAge, scores } = sourceData;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-10 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>

        {/* Page title */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-2">TintKin</p>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-primary">
            My Skin <span className="italic text-sage">Card</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            Download and share your skin health snapshot — watermarked with tintkin.com.
          </p>
        </div>

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
