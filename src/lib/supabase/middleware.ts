import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rate limit: simple in-middleware counter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 120; // per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

export async function updateSession(request: NextRequest) {
  try {
    // ── Rate limiting on API routes ──
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
      if (!checkRateLimit(ip)) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh the session — this keeps the auth token alive
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If no user and trying to access a protected route, redirect to login
    const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
    const isPublicRoute =
      isAuthRoute ||
      request.nextUrl.pathname.startsWith("/api/") ||
      request.nextUrl.pathname === "/";

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    // If user is logged in and trying to access auth page, redirect to dashboard
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (e) {
    // If middleware crashes, allow the request through
    console.error("[middleware] Error:", e);
    return NextResponse.next({ request });
  }
}
