const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://los-backend-dqay.onrender.com";

export async function getUserProfile() {
  const authData = getAuthData();
  const userId = getUserId(authData);
  const organizationId = authData.organizationId ?? authData.organization_id;

  if (organizationId === undefined || organizationId === null || organizationId === "") {
    throw new Error("Organization ID is missing from the verified session.");
  }

  const query = new URLSearchParams({ organizationId: String(organizationId) });
  const headers = { "Content-Type": "application/json" };

  if (authData.accessToken) {
    headers.Authorization = `Bearer ${authData.accessToken}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/administration/users/${userId}?${query.toString()}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Unable to read the user profile response.");
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || result?.error || "Unable to load the user profile.",
    );
  }

  if (!result?.data || typeof result.data !== "object") {
    throw new Error("The user profile response did not include user data.");
  }

  return result.data;
}

export async function updateUserProfile(updates) {
  const authData = getAuthData();
  const userId = getUserId(authData);
  const headers = { "Content-Type": "application/json" };

  if (authData.accessToken) {
    headers.Authorization = "Bearer " + authData.accessToken;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updates),
  });

  if (response.status === 204) return null;

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Unable to read the profile update response.");
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || result?.error || "Unable to update the user profile.",
    );
  }

  return result?.data && typeof result.data === "object" ? result.data : null;
}

function getAuthData() {
  const storedAuthData = window.localStorage.getItem("authData");

  if (!storedAuthData) {
    throw new Error("Verified session data is unavailable. Please sign in again.");
  }

  try {
    const authData = JSON.parse(storedAuthData);
    if (!authData || typeof authData !== "object") {
      throw new Error("Invalid session data.");
    }
    return authData;
  } catch {
    throw new Error("Verified session data is invalid. Please sign in again.");
  }
}

function getUserId(authData) {
  const userId = authData.user?.id;

  if (userId === undefined || userId === null || userId === "") {
    throw new Error("User ID is missing from the verified session.");
  }

  return userId;
}
