// Email confirmation is switched off until a sending domain is verified with
// Resend. All the code stays in place: set EMAIL_VERIFICATION_ENABLED=1 to
// turn the confirmation email, dashboard banner and settings prompt back on.
export const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED === "1";
