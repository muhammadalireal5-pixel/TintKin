import { redirect } from "next/navigation";
import { getSkinProfileForEdit } from "@/app/lib/actions";
import { getActivePlan } from "@/app/lib/plan-actions";
import SkinProfileEditor from "./SkinProfileEditor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Skin Profile",
  description: "Update your skin profile and rebuild your plan around it.",
  robots: { index: false, follow: false },
};

export default async function SkinProfilePage({ searchParams }) {
  const { step } = await searchParams;
  const [res, planRes] = await Promise.all([getSkinProfileForEdit(), getActivePlan()]);
  if (!res.success) redirect("/profile");
  return (
    <SkinProfileEditor
      initial={res.initial}
      hasProfile={res.hasProfile}
      hasPlan={Boolean(planRes?.success && planRes.plan)}
      lengthOnly={step === "length" && res.hasProfile}
    />
  );
}
