import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getBankProfile() {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const apiBaseUrl = /\/api\/v\d+$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api/v1`;
  const storedAuthData = window.localStorage.getItem("authData");
  if (!storedAuthData) {
    throw new Error("Verified session data is unavailable. Please sign in again.");
  }

  const headers = { "Content-Type": "application/json" };
  let authData;

  try {
    authData = JSON.parse(storedAuthData);
  } catch {
    throw new Error("Verified session data is invalid. Please sign in again.");
  }

  const organizationId = authData.organizationId ?? authData.organization_id;

  if (organizationId === undefined || organizationId === null || organizationId === "") {
    throw new Error("Organization ID is missing from the verified session.");
  }

  if (authData.accessToken) {
    headers.Authorization = "Bearer " + authData.accessToken;
  }

  const response = await fetch(
    `${apiBaseUrl}/administration/organizations/${organizationId}`,
    { method: "GET", headers, cache: "no-store" },
  );

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Unable to read the bank profile response.");
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || result?.error || "Unable to load the bank profile.",
    );
  }

  if (!result?.data || typeof result.data !== "object" || Array.isArray(result.data)) {
    throw new Error("The bank profile response did not include organization data.");
  }

  return result;
}

export async function createBankBranch(branch) {
  try {
    const response = await axios.post('/api/bank-profile/branch', branch, { headers: { 'Content-Type': 'application/json' } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Unable to submit the bank branch.');
  }
}
