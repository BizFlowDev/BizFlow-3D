import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Các route không cần authentication ────────────────────────────────────────

const PUBLIC_PATHS = ["/login", "/register"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname.startsWith(p));

const isStaticOrInternal = (pathname: string) =>
  pathname.startsWith("/_next") ||
  pathname.startsWith("/api") ||
  pathname.startsWith("/favicon") ||
  pathname.includes(".");

// ── JWT decode (không verify signature — edge runtime không có node crypto) ──

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua static files, _next, API routes
  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("bizflow.accessToken")?.value;

  // ── Public pages ──
  if (isPublicPath(pathname)) {
    // Nếu đã login → redirect khỏi login page
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        const role = payload.role as string;
        const dest = role === "admin" ? "/admin/stores" : "/";
        if (pathname !== dest) {
          return NextResponse.redirect(new URL(dest, request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // ── Protected pages — cần token ──
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT để lấy role
  const payload = decodeJwtPayload(token);
  if (!payload) {
    // Token malformed → redirect login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("bizflow.accessToken");
    return response;
  }

  const role = payload.role as string;

  // ── Role-based access control ──

  // Admin truy cập trang không phải /admin → redirect
  if (role === "admin" && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/stores", request.url));
  }

  // Employee/Owner truy cập /admin → redirect về dashboard
  if ((role === "employee" || role === "owner") && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// ── Config — chạy middleware trên các route này ───────────────────────────────

export const config = {
  matcher: [
    /*
     * Match tất cả request paths trừ:
     * - _next/static, _next/image (static files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
