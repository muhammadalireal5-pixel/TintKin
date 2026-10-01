import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getResetSecret } from "@/app/lib/reset-secret";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("reset-session");
    
    if (!sessionCookie || !sessionCookie.value) {
      return Response.json({ valid: false });
    }

    // Verify the JWT is still valid
    await jwtVerify(sessionCookie.value, getResetSecret());
    
    return Response.json({ valid: true });
  } catch {
    return Response.json({ valid: false });
  }
}
