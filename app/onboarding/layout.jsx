import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/app/lib/auth-server";
import { connectDb, User } from "@/app/lib/mongoose";

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
    let user = null;
    if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
      user = await User.findById(decoded.uid);
    }
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
    }
    if (!user) {
      user = await User.findOne({ firebaseUid: decoded.uid });
    }
    if (user?.onboardingComplete) {
        redirect("/dashboard");
    }
    
    return <>{children}</>;
}
