import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const session = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // If user is authenticated AND tries to access /signin or /signup → redirect to /dashboard
  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If NOT authenticated and tries to access protected routes → redirect to /
  if (
    !session &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/project") ||
      pathname.startsWith("/new"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/signin", "/signup", "/dashboard", "/new", "/project"],
};
