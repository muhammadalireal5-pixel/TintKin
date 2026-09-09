import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret-min-32-chars!!");

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("reset-session");
    
    if (!sessionCookie || !sessionCookie.value) {
      return Response.json({ valid: false });
    }

    // Verify the JWT is still valid
    await jwtVerify(sessionCookie.value, SECRET);
    
    return Response.json({ valid: true });
  } catch {
    return Response.json({ valid: false });
  }
}
