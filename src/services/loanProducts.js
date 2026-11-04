const getProductRows = (result) => [
  result?.data,
  result?.data?.items,
  result?.data?.products,
  result?.data?.records,
  result?.items,
  result?.products,
  result?.records,
].find(Array.isArray);

export async function getLoanProducts(signal, accessToken) {
  const response = await fetch('/api/loan-products', {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    signal,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || 'Unable to load loan products from the backend.');
  }

  const rows = getProductRows(result);
  if (!rows) throw new Error('The backend returned an unsupported loan product response.');

  return rows
    .filter((product) => product && product.active !== false && product.status?.toUpperCase() !== 'INACTIVE')
    .map((product) => {
      const name = product.name || product.product_name || product.productName || product.label;
      const rawCode = product.product_code ?? product.productCode ?? product.code;
      const code = rawCode == null ? '' : String(rawCode).trim();
      const rawRate = product.annual_interest_rate
        ?? product.annualInterestRate
        ?? product.interest_rate
        ?? product.interestRate
        ?? product.interest_rate_pa
        ?? product.interestRatePa;
      const annualInterestRate = rawRate === undefined || rawRate === null || rawRate === '' ? null : Number(rawRate);

      return {
        id: product.id ?? product.code ?? name,
        code,
        name,
        annualInterestRate: Number.isFinite(annualInterestRate) && annualInterestRate >= 0 ? annualInterestRate : null,
      };
    })
    .filter((product) => typeof product.name === 'string' && product.name.trim());
}