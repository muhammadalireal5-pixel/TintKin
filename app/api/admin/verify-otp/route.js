import { verifyAdminOTP } from "@/app/lib/admin-auth";

export async function POST(request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return Response.json({ success: false, error: "Email and code are required." }, { status: 400 });
    }

    const result = await verifyAdminOTP(email, code);

    if (!result.success) {
      return Response.json({ success: false, error: result.error }, { status: 401 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[Admin Verify OTP]", err);
    return Response.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}
