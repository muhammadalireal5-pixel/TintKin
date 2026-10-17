import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { adminListFeedback } from "@/app/lib/feedback-actions";
import FeedbackManager from "./FeedbackManager";
import AdminHeader from "../AdminHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback | TintKin Admin",
  robots: { index: false, follow: false },
};

export default async function AdminFeedbackPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const data = await adminListFeedback({});

  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminHeader current="feedback" />

      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-5 sm:py-6">
        <FeedbackManager initial={data.success ? data : null} loadError={data.success ? null : data.error} />
      </main>
    </div>
  );
}
