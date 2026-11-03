const STORAGE_KEY = 'los_lead_records';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL
).replace(/\/+$/, '');
export const USER_ORGANIZATION_ID = 3;
export const USER_ORGANIZATION_CODE = 'BOIBA01';
export const USER_ORGANIZATION_NAME = 'BOI123';

function getHeaders() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const storedAuthData = window.localStorage.getItem('authData');
    if (storedAuthData) {
      let authData;
      try {
        authData = JSON.parse(storedAuthData);
      } catch {
        throw new Error('Authentication data is invalid. Please sign in again.');
      }

      if (typeof authData?.accessToken === 'string' && authData.accessToken) {
        headers.Authorization = `Bearer ${authData.accessToken}`;
      }
    }
  }

  return headers;
}

function getServerErrorMessage(result) {
  if (!result || typeof result !== 'object') return '';
  if (typeof result.message === 'string' && result.message.trim()) return result.message;
  if (typeof result.error === 'string' && result.error.trim()) return result.error;

  const details = result.errors || result.details;
  if (Array.isArray(details)) {
    return details
      .map((item) => typeof item === 'string' ? item : item?.message)
      .filter((message) => typeof message === 'string' && message.trim())
      .join(' ');
  }

  if (details && typeof details === 'object') {
    return Object.entries(details)
      .flatMap(([field, messages]) => {
        const values = Array.isArray(messages) ? messages : [messages];
        return values
          .filter((message) => typeof message === 'string' && message.trim())
          .map((message) => `${field}: ${message}`);
      })
      .join(' ');
  }

  return '';
}

async function requestUsersApi(path, options, defaultMessage) {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...getHeaders(), ...options.headers },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach the user service. Check your connection and try again.');
    }
    throw error;
  }

  let responseText;
  try {
    responseText = await response.text();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to read the user service response. Please try again.');
    }
    throw error;
  }

  let result = null;
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error('The user service returned an unexpected response.');
      }
    }
  }

  if (!response.ok || result?.success === false) {
    const fallback = response.status >= 500
      ? 'The user service is temporarily unavailable. Please try again.'
      : response.status === 401 || response.status === 403
        ? 'You are not authorized to access users. Please sign in again or contact an administrator.'
        : defaultMessage;
    throw new Error(getServerErrorMessage(result) || fallback);
  }

  return result;
}

function getUserList(result) {
  if (Array.isArray(result)) return result;
  if (result === null) return [];

  const candidates = [
    result?.users,
    result?.data,
    result?.content,
    result?.items,
    result?.data?.users,
    result?.data?.content,
    result?.data?.items,
  ];

  const users = candidates.find(Array.isArray);
  if (!users) {
    throw new Error('The user service returned an unexpected user list.');
  }

  return users;
}

export async function getUsers() {
  const result = await requestUsersApi(
    '/api/v1/users',
    { method: 'GET', headers: { Accept: 'application/json' } },
    'Unable to load users.',
  );

  return getUserList(result);
}

export async function createUser(user) {
  return requestUsersApi(
    '/api/v1/users',
    {
      method: 'POST',
      body: JSON.stringify({
        ...user,
        organizationId: USER_ORGANIZATION_ID,
        organizationCode: USER_ORGANIZATION_CODE,
        organizationName: USER_ORGANIZATION_NAME,
      }),
    },
    'Unable to create user.',
  );
}

export function getLeads() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
     
    }
  }

  return [];
}

export function saveLeads(leads) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      // Keep the current in-memory lead list available when browser storage is unavailable.
    }
  }

  return leads;
}
