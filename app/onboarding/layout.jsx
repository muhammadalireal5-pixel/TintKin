import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/firebase/admin";
import { connectDb, User } from "@/app/lib/mongoose";

export const metadata = {
  title: "Get Started",
  description: "Set up your TintKin profile to get personalized skincare insights.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingLayout({ children }) {
    let decoded;
    try {
      decoded = await getAuthenticatedUser();
    } catch (e) {
      redirect("/sign-in");
    }
    if (!decoded) redirect("/sign-in");

    await connectDb();
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user && decoded.email) {
      const candidates = await User.find({ email: decoded.email });
      if (candidates.length === 1) {
        const candidate = candidates[0];
        if (!candidate.firebaseUid) {
          candidate.firebaseUid = decoded.uid;
          await candidate.save();
          user = candidate;
        }
      }
    }
    if (user?.onboardingComplete) {
        redirect("/dashboard");
    }
    
    return <>{children}</>;
}
