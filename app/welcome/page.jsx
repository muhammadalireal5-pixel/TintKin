import { redirect } from "next/navigation";
import { getWelcomeState } from "@/app/lib/plan-actions";
import WelcomeClient from "./WelcomeClient";

export const metadata = {
  title: "Build Your Plan",
  description: "Take one selfie and get a personal 30-day skin plan.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const state = await getWelcomeState();
  // Already has a plan: nothing to set up, go straight to it.
  if (state.success && state.hasPlan) redirect("/routine");

  return (
    <WelcomeClient
      firstName={state.success ? state.firstName : ""}
      goals={state.success ? state.goals : []}
      needsConsent={state.success ? state.needsConsent : true}
      hasScan={state.success ? state.hasScan : false}
    />
  );
}
