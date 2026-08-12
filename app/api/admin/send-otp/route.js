import { sendAdminOTP } from "@/app/lib/admin-auth";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const result = await sendAdminOTP(email);
    
    if (!result.success) {
      return Response.json({ success: false, error: result.error }, { status: 429 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[Admin Send OTP]", err);
    return Response.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}
