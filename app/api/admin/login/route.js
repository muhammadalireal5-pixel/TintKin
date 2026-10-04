import { adminLogin } from "@/app/lib/admin-auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ success: false, error: "Email and password are required." }, { status: 400 });
    }

    const result = await adminLogin(email, password);

    if (!result.success) {
      return Response.json({ success: false, error: result.error }, { status: result.status || 401 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}
