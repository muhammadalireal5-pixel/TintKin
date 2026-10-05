import "server-only";
import { Resend } from "resend";

let resendClient = null;
function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Tells the user their next skin report is ready to generate. Best-effort:
 * returns false instead of throwing so a mail outage never fails a scan.
 */
export async function sendReportReadyEmail({ email, name, scanCount }) {
  const resend = getResendClient();
  if (!resend || !email) return false;

  const reportsUrl = `${getBaseUrl()}/reports`;
  const firstName = escapeHtml((name || "").trim().split(/\s+/)[0] || "there");

  try {
    await resend.emails.send({
      from: "TintKin <onboarding@resend.dev>",
      to: [email],
      subject: "✦ Your weekly skin report is ready",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAF9F6; border-radius: 16px; color: #2C3E50;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: #E6E6FA; font-size: 22px;">✦</span>
            <h1 style="color: #2C3E50; font-size: 22px; margin: 12px 0 4px; letter-spacing: -0.5px;">TintKin</h1>
            <p style="color: #7F8C8D; font-size: 14px; margin: 0;">Weekly Skin Report</p>
          </div>
          <div style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #2C3E50; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Hi ${firstName}, you did it!</p>
            <p style="color: #555; font-size: 14px; margin: 0 0 18px; line-height: 1.5;">
              You've completed ${Number(scanCount) || 7} scans since your last report. Your personalised weekly skin report is ready to generate.
            </p>
            <a href="${reportsUrl}" style="display: inline-block; background: #2C3E50; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
              Generate my report
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            You're receiving this because you track your skin with TintKin.
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Failed to send report-ready email:", err);
    return false;
  }
}
