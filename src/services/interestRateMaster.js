const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';
let interestRateMastersRequest = null;

function getApiV1Url() {
  if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  return /\/api\/v\d+$/i.test(API_BASE_URL)
    ? API_BASE_URL
    : `${API_BASE_URL}/api/v1`;
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

function getProductRows(result) {
  const data = result?.data;
  const rows = [
    data,
    data?.items,
    data?.products,
    data?.records,
    data?.results,
    result?.items,
    result?.products,
    result?.records,
    result?.results
  ].find(Array.isArray);

  if (rows) return rows;
  if (
    data &&
    typeof data === 'object' &&
    (data.product_code != null || data.productCode != null || data.code != null)
  ) {
    return [data];
  }
  return null;
}

function getInterestRateMasterRows(result) {
  const data = result?.data;
  const rows = [
    data,
    data?.items,
    data?.masters,
    data?.interest_rate_masters,
    data?.interestRateMasters,
    data?.records,
    data?.results,
    data?.data,
    result?.items,
    result?.masters,
    result?.interest_rate_masters,
    result?.interestRateMasters,
    result?.records,
    result?.results
  ].find(Array.isArray);

  if (rows) return rows;
  if (data && typeof data === 'object' && (data.product_code != null || data.productCode != null)) {
    return [data];
  }
  return null;
}

function normalizeInterestRateMaster(master, index) {
  const productCode = String(master.product_code ?? master.productCode ?? '').trim();
  const effectiveDate = String(master.effective_date ?? master.effectiveDate ?? '').slice(0, 10);
  const tiers = master.tiers ?? master.bands ?? master.rate_tiers ?? master.rateTiers ?? [];

  return {
    id: master.id ?? master._id ?? `${productCode}-${effectiveDate}-${index}`,
    productCode,
    productName: String(master.product_name ?? master.productName ?? ''),
    effectiveDate,
    bands: Array.isArray(tiers) ? tiers.map((tier, tierIndex) => ({
      id: tier.id ?? tier._id ?? `${productCode}-${effectiveDate}-tier-${tierIndex}`,
      upToAmount: tier.up_to_amount ?? tier.upToAmount ?? '',
      upToMonths: tier.up_to_months ?? tier.upToMonths ?? '',
      normalInterest: tier.normal_interest_rate ?? tier.normalInterest ?? '',
      penalRate: tier.penal_rate ?? tier.penalRate ?? '',
      adhocRate: tier.adhoc_rate ?? tier.adhocRate ?? ''
    })) : []
  };
}

async function fetchInterestRateMasters() {
  const response = await fetch(`${getApiV1Url()}/interest-rate-master`, {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || 'Unable to load interest rate masters.');
  }

  const rows = getInterestRateMasterRows(result);
  if (!rows) throw new Error('The interest rate service returned an unsupported master list.');
  return rows.map(normalizeInterestRateMaster);
}

export function getInterestRateMasters({ refresh = false } = {}) {
  if (!interestRateMastersRequest || refresh) {
    const request = fetchInterestRateMasters();
    interestRateMastersRequest = request;
    request.then(
      () => {
        if (interestRateMastersRequest === request) interestRateMastersRequest = null;
      },
      () => {
        if (interestRateMastersRequest === request) interestRateMastersRequest = null;
      }
    );
  }
  return interestRateMastersRequest;
}

export async function searchInterestRateProducts(search, signal) {
  const query = search.trim();
  if (!query) return [];

  const response = await fetch(
    `${getApiV1Url()}/product-management?search=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
      signal
    }
  );
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || 'Unable to search products.');
  }

  const rows = getProductRows(result);
  if (!rows) throw new Error('The product service returned an unsupported product list.');

  return rows
    .filter((product) => product && product.active !== false && String(product.status ?? '').toUpperCase() !== 'INACTIVE')
    .map((product) => ({
      name: String(product.product_name ?? product.productName ?? product.name ?? product.label ?? '').trim(),
      code: String(product.product_code ?? product.productCode ?? product.code ?? '').trim()
    }))
    .filter((product) => product.name && product.code);
}

export async function saveInterestRateMaster(rateMaster) {
  const response = await fetch(`${getApiV1Url()}/interest-rate-master`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(rateMaster)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || 'Unable to save interest rates.');
  }
  return { configured: true, result };
}