const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://los-backend-at5n.onrender.com"
).replace(/\/+$/, "");
const API_V1_URL = /\/api\/v\d+$/i.test(API_BASE_URL)
  ? API_BASE_URL
  : `${API_BASE_URL}/api/v1`;

function getRequestHeaders() {
  const storedAuthData = window.localStorage.getItem("authData");
  if (!storedAuthData) {
    throw new Error("Your session is unavailable. Please sign in again.");
  }

  let authData;
  try {
    authData = JSON.parse(storedAuthData);
  } catch {
    throw new Error("Your session is invalid. Please sign in again.");
  }

  if (!authData?.accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${authData.accessToken}`,
  };
}

async function requestLookupApi(path, options = {}) {
  const response = await fetch(`${API_V1_URL}${path}`, {
    ...options,
    headers: getRequestHeaders(),
    cache: "no-store",
  });
  console.log(`Lookup API request to ${path} returned status ${response.status}`);
  console.log(response, "ad");
  console.log(options, "options");

  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || result?.error || `Lookup request failed (${response.status}).`,
    );
  }

  return result;
}

function toDisplayStatus(status, isActive = true) {
  const active = status ? status.toUpperCase() === "ACTIVE" : isActive;
  return active ? "Active" : "Inactive";
}

export async function getLookupTypes(signal) {
  const result = await requestLookupApi("/administration/lookups/types", {
    method: "GET",
    signal,
  });
  if (!Array.isArray(result?.data)) {
    throw new Error("The lookup service returned an unsupported lookup list.");
  }
  return result.data.map((lookup) => ({
    id: lookup.id ?? lookup.code,
    code: lookup.code ?? "",
    name: lookup.name ?? "",
    description: lookup.description ?? "",
    status: toDisplayStatus(lookup.status, lookup.isActive),
    isFixed: Boolean(lookup.isFixed),
    subLookups: [],
  }));
}

export async function getLookupOptions(lookupTypeCode, signal) {
  const result = await requestLookupApi(
    `/administration/lookups/${encodeURIComponent(lookupTypeCode)}/options`,
    { method: "GET", signal },
  );
  if (!Array.isArray(result?.data)) {
    throw new Error(`The lookup options for ${lookupTypeCode} were not returned as a list.`);
  }
  return result.data.map((option, index) => {
    const name = option.description ?? option.name ?? option.code ?? "";
    return {
      id: option.id ?? option.code ?? `${lookupTypeCode}-${index}`,
      code: option.code ?? "",
      name,
      description: option.description ?? "",
      status: toDisplayStatus(option.status, option.isActive),
    };
  });
}

export async function createLookupType(lookupType) {
  return requestLookupApi("/administration/lookups/types", {
    method: "POST",
    body: JSON.stringify(lookupType),
  });
}

export async function createLookupSubType(lookupTypeCode, subType) {
  return requestLookupApi(
    `/administration/lookups/types/${encodeURIComponent(lookupTypeCode)}/sub-types`,
    {
      method: "POST",
      body: JSON.stringify(subType),
    },
  );
}

export async function setLookupTypeActive(lookupType, active) {
  const action = active ? "activate" : "deactivate";
  return requestLookupApi(
    `/administration/lookups/types/${encodeURIComponent(lookupType.code)}/${action}`,
    { method: "PATCH" },
  );
}

export async function setLookupSubTypeActive(subTypeId, active) {
  console.log("setLookupSubTypeActive", subTypeId, active);
  const action = active ? "activate" : "deactivate";
  return requestLookupApi(
    `/administration/lookups/sub-types/${encodeURIComponent(subTypeId)}/${action}`,
    { method: "PATCH" },
  );
}