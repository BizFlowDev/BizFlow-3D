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

function isJwtExpired(payload: Record<string, unknown> | null): boolean {
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 <= Date.now();
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
    // Nếu đã login và token còn hạn → redirect khỏi login page
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload && !isJwtExpired(payload)) {
        const role = payload.role as string;
        const dest = role === "admin" ? "/admin/stores" : role === "employee" ? "/orders/new" : "/";
        if (pathname !== dest) {
          return NextResponse.redirect(new URL(dest, request.url));
        }
      } else {
        // Token malformed hoặc đã hết hạn → xóa cookie
        const response = NextResponse.next();
        response.cookies.delete("bizflow.accessToken");
        return response;
      }
    }
    return NextResponse.next();
  }

  // ── Protected pages — cần token còn hạn ──
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT để lấy role và check hạn
  const payload = decodeJwtPayload(token);
  if (!payload || isJwtExpired(payload)) {
    // Token malformed hoặc đã hết hạn → xóa cookie & redirect login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("bizflow.accessToken");
    return response;
  }

  const role = payload.role as string;

  // ── Role-based access control ──

  // Admin truy cập trang không phải /admin → redirect
  if (role === "admin" && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/stores", request.url));
  }

  // Employee/Owner truy cập /admin → redirect về trang phù hợp
  if ((role === "employee" || role === "owner") && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL(role === "employee" ? "/orders/new" : "/", request.url));
  }

  // Employee không truy cập trang Tổng quan (/) → redirect về /orders/new
  if (role === "employee" && pathname === "/") {
    return NextResponse.redirect(new URL("/orders/new", request.url));
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
