import { checkOnboardingStatus, getScanConsentStatus, getUsageQuotas } from "@/app/lib/actions";
import CaptureClient from "./CaptureClient";

export default function CapturePage() {
    // Kicked off here, not awaited, so the page shell (and the CTA buttons)
    // render immediately. The DB round-trip runs in parallel with the client
    // bundle downloading/hydrating, so by the time a tap is possible the
    // camera/gallery picker no longer waits on it.
    const precheckPromise = Promise.all([
        checkOnboardingStatus().catch(() => ({ complete: false })),
        getScanConsentStatus().catch(() => ({ needsConsent: false })),
    ]).then(([onboarding, consent]) => ({
        onboardingComplete: onboarding.complete,
        needsConsent: consent.needsConsent,
    }));

    // Separate promise so the camera never waits on it — it only lets a
    // used-up allowance show before the user takes a photo, not after.
    const quotasPromise = getUsageQuotas().catch(() => null);

    return <CaptureClient precheckPromise={precheckPromise} quotasPromise={quotasPromise} />;
}
