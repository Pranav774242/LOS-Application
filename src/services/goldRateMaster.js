const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';
const STORAGE_KEY = 'los_gold_rate_master_records';

function getApiV1Url() {
  if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  return /\/api\/v\d+$/i.test(API_BASE_URL)
    ? API_BASE_URL
    : `${API_BASE_URL}/api/v1`;
}

function authHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  let authData;

  try {
    authData = JSON.parse(window.localStorage.getItem('authData') || '{}');
  } catch {
    throw new Error('Your sign-in session is invalid. Please sign in again.');
  }

  if (authData.accessToken) headers.Authorization = `Bearer ${authData.accessToken}`;
  return headers;
}

async function getResponseData(response, fallbackMessage) {
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.error || fallbackMessage);
  }
  return result;
}

function getRows(result, keys) {
  const data = result?.data;
  const rows = [data, ...keys.map((key) => data?.[key]), ...keys.map((key) => result?.[key])]
    .find(Array.isArray);
  if (rows) return rows;
  if (data && typeof data === 'object' && (data.product_code != null || data.productCode != null || data.code != null)) {
    return [data];
  }
  return null;
}

function readGoldRateMasters() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  let masters;
  try {
    masters = JSON.parse(stored);
  } catch {
    throw new Error('Saved gold rate records could not be read. Clear the invalid browser data to continue.');
  }

  if (!Array.isArray(masters)) {
    throw new Error('Saved gold rate records have an invalid format.');
  }

  return masters.map((master, index) => {
    const productCode = String(master?.product_code ?? master?.productCode ?? '').trim();
    const effectiveDate = String(master?.effective_date ?? master?.effectiveDate ?? '').slice(0, 10);
    const rates = master?.rates;
    if (!master || typeof master !== 'object' || !Array.isArray(rates)) {
      throw new Error('Saved gold rate records have an invalid format.');
    }

    return {
      id: String(master.id ?? master._id ?? `${productCode}-${effectiveDate}-${index}`),
      productCode,
      productName: String(master.product_name ?? master.productName ?? ''),
      effectiveDate,
      rates: rates.map((rate, rateIndex) => ({
        id: Number(rate?.id) || rateIndex + 1,
        purityCarat: String(rate?.purity_carat ?? rate?.purityCarat ?? ''),
        netWeight: String(rate?.net_weight ?? rate?.netWeight ?? ''),
        rate: String(rate?.rate ?? ''),
        marginPercent: String(rate?.margin_percent ?? rate?.marginPercent ?? '')
      }))
    };
  });
}

export async function searchGoldProducts(search, signal) {
  const query = search.trim();
  if (!query) return [];

  const params = new URLSearchParams({ search: query, category: 'gold' });
  const response = await fetch(`${getApiV1Url()}/product-management?${params}`, {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
    signal
  });
  const result = await getResponseData(response, 'Unable to search gold products.');
  const rows = getRows(result, ['items', 'products', 'records', 'results']);
  if (!rows) throw new Error('The product service returned an unsupported product list.');

  return rows
    .filter((product) => product && product.active !== false && String(product.status ?? '').toUpperCase() !== 'INACTIVE')
    .map((product) => ({
      name: String(product.product_name ?? product.productName ?? product.name ?? product.label ?? '').trim(),
      code: String(product.product_code ?? product.productCode ?? product.code ?? '').trim()
    }))
    .filter((product) => product.name && product.code);
}

export function getGoldRateMasters() {
  return readGoldRateMasters();
}

export function saveGoldRateMaster(rateMaster, existingId) {
  const masters = readGoldRateMasters();
  const id = existingId == null
    ? globalThis.crypto.randomUUID()
    : String(existingId);
  const master = {
    id,
    productCode: String(rateMaster.product_code ?? '').trim(),
    productName: String(rateMaster.product_name ?? '').trim(),
    effectiveDate: String(rateMaster.effective_date ?? '').slice(0, 10),
    rates: Array.isArray(rateMaster.rates) ? rateMaster.rates.map((rate, index) => ({
      id: index + 1,
      purityCarat: String(rate.purity_carat ?? ''),
      netWeight: String(rate.net_weight ?? ''),
      rate: String(rate.rate ?? ''),
      marginPercent: String(rate.margin_percent ?? '')
    })) : []
  };
  const updatedMasters = [master, ...masters.filter((item) => item.id !== id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMasters));
  return master;
}

export function deleteGoldRateMaster(id) {
  const masters = readGoldRateMasters();
  const updatedMasters = masters.filter((master) => master.id !== String(id));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMasters));
  return updatedMasters;
}
