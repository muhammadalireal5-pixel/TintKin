"use client";

import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/lib/actions";
import SkinQuestionnaire from "@/app/components/SkinQuestionnaire";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <SkinQuestionnaire
      onSubmit={async (payload) => {
        const res = await completeOnboarding(payload);
        if (res.success) router.replace("/welcome");
        return res;
      }}
    />
  );
}
