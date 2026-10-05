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

function buildCsp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://res.cloudinary.com https://yce-us.s3-accelerate.amazonaws.com data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const withCsp = (response) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  // Protect Admin routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminSession = request.cookies.get("admin-session")?.value || request.cookies.get("admin_session")?.value;
    if (!adminSession) {
      const loginUrl = new URL("/admin/login", request.url);
      return withCsp(NextResponse.redirect(loginUrl));
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
      return withCsp(NextResponse.redirect(signInUrl));
    }
  }

  // If already logged in, redirect away from auth pages to dashboard
  const isAuthPath = authPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isAuthPath && session) {
    return withCsp(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
