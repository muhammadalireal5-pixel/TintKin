import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { User } from "@/app/lib/mongoose";

export default async function OnboardingLayout({ children }) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");
    
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (user?.onboardingComplete) {
        redirect("/dashboard");
    }
    
    return <>{children}</>;
}
