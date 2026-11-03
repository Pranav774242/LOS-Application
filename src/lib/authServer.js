import { NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL
).replace(/\/+$/, "");
export const AUTH_SESSION_COOKIE = "los-session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export function readSessionAccessToken(value) {
  if (typeof value !== "string") return null;

  const [header, payload, signature, ...extra] = value.split(".");
  if (!header || !payload || !signature || extra.length) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isFinite(claims.exp) && claims.exp * 1000 > Date.now()
      ? value
      : null;
  } catch {
    return null;
  }
}

export async function forwardAuthRequest(request, path, requireAccessToken = false) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid authentication request" },
      { status: 400 },
    );
  }

  let upstream;
  try {
    upstream = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to reach the authentication service" },
      { status: 502 },
    );
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid response from the authentication service" },
      { status: 502 },
    );
  }

  if (!upstream.ok || result?.success === false) {
    return NextResponse.json(result, { status: upstream.status });
  }

  const accessToken = result?.data?.accessToken;
  if (
    (requireAccessToken || !result?.data?.otpRequired) &&
    !readSessionAccessToken(accessToken)
  ) {
    return NextResponse.json(
      { success: false, message: "The authentication response did not include a valid access token" },
      { status: 502 },
    );
  }

  const response = NextResponse.json(result, { status: upstream.status });
  if (accessToken && !result?.data?.otpRequired) {
    response.cookies.set(AUTH_SESSION_COOKIE, accessToken, sessionCookieOptions);
  }

  return response;
}

export async function clearAuthSession(request) {
  const accessToken = readSessionAccessToken(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
  );
  let response;

  if (!accessToken) {
    response = NextResponse.json({ success: true });
  } else {
    let upstream;
    try {
      upstream = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } catch {
      response = NextResponse.json(
        { success: false, message: "Unable to reach the authentication service" },
        { status: 502 },
      );
    }

    if (upstream) {
      let result;
      try {
        result = await upstream.json();
      } catch {
        result = upstream.ok
          ? { success: true }
          : { success: false, message: "Unable to log out" };
      }
      response = NextResponse.json(result, {
        status: upstream.ok ? 200 : upstream.status,
      });
    }
  }

  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
