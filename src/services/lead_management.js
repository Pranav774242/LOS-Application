const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://los-backend-dqay.onrender.com'
).replace(/\/+$/, '');
const API_V1_URL = /\/api\/v\d+$/i.test(API_BASE_URL)
  ? API_BASE_URL
  : `${API_BASE_URL}/api/v1`;

function getRequestHeaders() {
  const storedAuthData = window.localStorage.getItem('authData');
  if (!storedAuthData) {
    throw new Error('Your session is unavailable. Please sign in again.');
  }

  let authData;
  try {
    authData = JSON.parse(storedAuthData);
  } catch {
    throw new Error('Your session is invalid. Please sign in again.');
  }

  if (!authData?.accessToken) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${authData.accessToken}`,
  };
}

async function requestLeads(path, options, defaultMessage) {
  const response = await fetch(path, {
    ...options,
    headers: getRequestHeaders(),
  });

  if (response.status === 204) return null;

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? 'The lead service returned an unreadable response.'
        : `${defaultMessage} (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || `${defaultMessage} (HTTP ${response.status}).`);
  }

  return result;
}

export async function createLead(lead) {
  return requestLeads(
    `${API_V1_URL}/leads`,
    { method: 'POST', body: JSON.stringify(lead) },
    'Unable to create lead',
  );
}

export async function getAllLeads() {
  const result = await requestLeads(
    `${API_V1_URL}/leads`,
    { method: 'GET', cache: 'no-store' },
    'Unable to load leads',
  );
  const records = [
    result,
    result?.data?.leads,
    result?.data?.items,
    result?.data?.records,
    result?.data?.content,
    result?.data,
    result?.leads,
    result?.items,
    result?.records,
    result?.content,
  ].find(Array.isArray);

  if (!records) {
    throw new Error('The lead service returned an unsupported lead list response.');
  }

  return records;
}

export async function getLeadById(leadId) {
  if (!leadId) throw new Error('A lead ID is required to load lead details.');

  const result = await requestLeads(
    `${API_V1_URL}/leads/${encodeURIComponent(leadId)}`,
    { method: 'GET', cache: 'no-store' },
    'Unable to load lead details',
  );
  const lead = result?.data?.lead || result?.data || result?.lead || result;

  if (!lead || typeof lead !== 'object' || Array.isArray(lead)) {
    throw new Error('The lead service returned an unsupported lead detail response.');
  }

  return lead;
}

export async function updateLead(leadId, updates) {
  if (!leadId) throw new Error('A lead ID is required to update the lead.');

  return requestLeads(
    `${API_V1_URL}/leads/${encodeURIComponent(leadId)}`,
    { method: 'PUT', body: JSON.stringify(updates) },
    'Unable to update lead',
  );
}

export async function assignLead(leadId, employeeId, assignedBy) {
  if (!leadId) throw new Error('A lead ID is required to assign the lead.');
  if (!employeeId) throw new Error('Select a maker to assign this lead.');
  if (!assignedBy) throw new Error('Your employee ID is unavailable. Please sign in again.');

  return requestLeads(
    `${API_V1_URL}/leads/${encodeURIComponent(leadId)}/assign`,
    {
      method: 'PUT',
      body: JSON.stringify({ employeeId, assignedBy }),
    },
    'Unable to assign lead',
  );
}

export async function exportAllLeads() {
  const response = await fetch(`${API_V1_URL}/leads/export`, {
    method: 'GET',
    headers: {
      ...getRequestHeaders(),
      Accept: 'text/csv, application/octet-stream',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Unable to export leads (HTTP ${response.status}).`;
    try {
      const result = await response.json();
      message = result?.message || result?.error || message;
    } catch {
      // Keep the HTTP-specific error when the proxy response is not JSON.
    }
    throw new Error(message);
  }

  return response.blob();
}

export async function importLeadsCsv(file, onProgress) {
  if (!(file instanceof File)) throw new Error('Choose a CSV file to import.');
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Only .csv files can be imported.');

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_V1_URL}/leads/import`);
    request.setRequestHeader('Authorization', getRequestHeaders().Authorization);

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 99)));
    });

    request.addEventListener('load', () => {
      let result;
      try {
        result = request.responseText ? JSON.parse(request.responseText) : {};
      } catch {
        result = { message: request.responseText };
      }

      if (request.status < 200 || request.status >= 300 || result?.success === false) {
        reject(new Error(result?.message || result?.error || `Unable to import leads (HTTP ${request.status}).`));
        return;
      }

      onProgress?.(100);
      resolve(result);
    });

    request.addEventListener('error', () => reject(new Error('Unable to connect to the leads service.')));
    request.addEventListener('abort', () => reject(new Error('The lead import was cancelled.')));
    request.send(formData);
  });
}