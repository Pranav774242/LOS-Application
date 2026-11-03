export const LOGOUT_PENDING_KEY = "los-logout-pending";

export async function login(credentials) {
  return request(
    "/api/v1/auth/login",
    credentials,
    "Unable to sign in",
  );
}

export async function verifyOtp({ tempSessionToken, otp }) {
  return request(
    "/api/auth/verify-otp",
    { tempSessionToken, otp },
    "Unable to verify OTP",
  );
}

export async function logout() {
  return request(
    "/api/auth/logout",
    undefined,
    "Unable to log out",
  );
}

async function request(path, body, defaultMessage) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(defaultMessage);
  }

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || defaultMessage);
  }

  return result;
}
