import { getUserProfile } from "@/app/lib/actions";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Profile",
    description: "Your TintKin account, plan and settings.",
    robots: { index: false, follow: false },
};

export default async function ProfilePage() {
    const profile = await getUserProfile();
    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <ProfileClient profile={profile} />
        </div>
    );
}
