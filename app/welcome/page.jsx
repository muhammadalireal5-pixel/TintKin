import { redirect } from "next/navigation";
import { getWelcomeState } from "@/app/lib/plan-actions";
import WelcomeClient from "./WelcomeClient";

export const metadata = {
  title: "Your Plan",
  description: "Your personal 30-day skin plan, built from your answers.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const state = await getWelcomeState();
  // Already has a plan: nothing to set up, go straight to it.
  if (state.success && state.hasPlan) redirect("/routine");
  if (!state.success) redirect("/dashboard");

  return <WelcomeClient firstName={state.firstName} profile={state.profile} />;
}
