import { redirect } from "next/navigation";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { connectDb } from "@/app/lib/mongoose";

export const metadata = {
  title: "Get Started",
  description: "Set up your TintKin profile to get personalized skincare insights.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }) {
    let decoded;
    try {
      decoded = await getAuthenticatedUser();
    } catch (e) {
      redirect("/sign-in");
    }
    if (!decoded) redirect("/sign-in");

    await connectDb();
    const user = await findSessionUser(decoded);
    if (user?.onboardingComplete) {
        redirect("/dashboard");
    }
    
    return <>{children}</>;
}
