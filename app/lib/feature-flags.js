// Email confirmation is switched off until a sending domain is verified with
// Resend. All the code stays in place: set EMAIL_VERIFICATION_ENABLED=1 to
// turn the confirmation email, dashboard banner and settings prompt back on.
export const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED === "1";
export const COACH_ENGINE_ENABLED = process.env.COACH_ENGINE_ENABLED !== "0";

export const ALL_PREMIUM = process.env.ALL_PREMIUM !== "0";

export function effectiveTier(user) {
  return ALL_PREMIUM ? "premium" : user?.tier || "free";
}
