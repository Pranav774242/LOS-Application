const API_BASE_URL = 'http://localhost:8080';

function getProductManagementUrl(id) {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const resourceUrl = /\/api\/v\d+$/i.test(baseUrl)
    ? `${baseUrl}/product-management`
    : `${baseUrl}/api/v1/product-management`;

  return id === undefined ? resourceUrl : `${resourceUrl}/${encodeURIComponent(id)}`;
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  try {
    const authData = JSON.parse(window.localStorage.getItem('authData') || '{}');
    if (authData.accessToken) headers.Authorization = `Bearer ${authData.accessToken}`;
  } catch {
    throw new Error('Your sign-in session is invalid. Please sign in again.');
  }
  return headers;
}

async function requestProductManagement(url, options, fallbackMessage) {
  const response = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
    cache: 'no-store'
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || `${fallbackMessage} (HTTP ${response.status}).`);
  }
  if (!result || typeof result !== 'object') {
    throw new Error('The product management API returned an invalid response.');
  }

  return result;
}

function normalizeProduct(product) {
  if (!product || typeof product !== 'object') {
    throw new Error('The product management API returned an invalid product.');
  }

  const minTenure = product.minTenureMonths ?? product.min_tenure_months ?? product.minTenure ?? '';
  const maxTenure = product.maxTenureMonths ?? product.max_tenure_months ?? product.maxTenure ?? '';
  const delegationPower = product.delegationPower ?? product.delegation_of_power;

  return {
    ...product,
    id: product.id,
    productCode: product.productCode ?? product.product_code ?? '',
    productName: product.productName ?? product.product_name ?? '',
    emi: product.emi ?? '',
    emiType: product.emiType ?? product.emi_type ?? '',
    minTenure: String(minTenure),
    minTenureUnit: product.minTenureUnit || 'Months',
    maxTenure: String(maxTenure),
    maxTenureUnit: product.maxTenureUnit || 'Months',
    minAmount: String(product.minAmount ?? product.min_amount ?? ''),
    maxAmount: String(product.maxAmount ?? product.max_amount ?? ''),
    penalty: product.penalty ?? false,
    penaltyPercent: String(product.penaltyPercent ?? product.penalty_percent ?? ''),
    daysInYear: String(product.daysInYear ?? product.noOfDaysInYear ?? product.no_of_days_in_year ?? ''),
    intBaseMethod: product.intBaseMethod ?? product.int_base_method ?? '',
    interestFrequency: product.interestFrequency ?? product.interestCalculationFrequency ?? product.interest_calculation_frequency ?? '',
    calculationMode: product.calculationMode ?? product.interestCalculationMode ?? product.interest_calculation_mode ?? '',
    delegationPower: Array.isArray(delegationPower)
      ? delegationPower.map((row, index) => ({ ...row, id: row.id ?? index + 1, limit: String(row.limit ?? '') }))
      : []
  };
}

async function getProductList(url, signal) {
  const result = await requestProductManagement(url, { method: 'GET', signal }, 'Unable to load products.');
  if (!Array.isArray(result.data)) {
    throw new Error('The product management API returned an unsupported product list.');
  }
  return result.data.map(normalizeProduct);
}

export async function listProductManagementProducts(signal) {
  return getProductList(getProductManagementUrl(), signal);
}

export async function searchProductManagementProducts(search, signal) {
  const url = new URL(getProductManagementUrl());
  url.searchParams.set('search', search);
  return getProductList(url.toString(), signal);
}

export async function getProductManagementProduct(id, signal) {
  const result = await requestProductManagement(
    getProductManagementUrl(id),
    { method: 'GET', signal },
    'Unable to load the product.'
  );
  return normalizeProduct(result.data);
}

export async function createProductManagementProduct(product) {
  const result = await requestProductManagement(
    getProductManagementUrl(),
    { method: 'POST', body: JSON.stringify(product) },
    'Unable to create the product.'
  );
  return { ...result, data: normalizeProduct(result.data) };
}

export async function updateProductManagementProduct(id, product) {
  const result = await requestProductManagement(
    getProductManagementUrl(id),
    { method: 'PUT', body: JSON.stringify(product) },
    'Unable to update the product.'
  );
  return { ...result, data: normalizeProduct(result.data) };
}

export function deactivateProductManagementProduct(id) {
  return requestProductManagement(
    getProductManagementUrl(id),
    { method: 'DELETE' },
    'Unable to deactivate the product.'
  );
}
