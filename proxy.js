import { NextResponse } from "next/server";

const protectedUserPaths = [
  "/dashboard",
  "/capture",
  "/what-if",
  "/history",
  "/onboarding",
  "/share",
  "/leaderboard",
];

const authPaths = [
  "/sign-in",
  "/sign-up",
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Protect Admin routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminSession = request.cookies.get("admin-session")?.value || request.cookies.get("admin_session")?.value;
    if (!adminSession) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect User routes
  const isProtectedUserPath = protectedUserPaths.some((p) => pathname.startsWith(p));
  const sessionCookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  const session = request.cookies
    .getAll()
    .find(
      (c) =>
        sessionCookieNames.some((n) => c.name === n || c.name.startsWith(`${n}.`)) &&
        Boolean(c.value)
    )?.value;

  if (isProtectedUserPath) {
    if (!session) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // If already logged in, redirect away from auth pages to dashboard
  const isAuthPath = authPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
