const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://los-backend-dqay.onrender.com';
const endpoints = [
  '/api/v1/banks/profile',
  '/api/v1/bank/profile',
  '/api/v1/bank-profile/detail',
  '/api/v1/banks/summary',
  '/api/v1/bank-profile',
];

export async function GET(request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ message: '' }, { status: 401 });
  }

  let missingRouteMessage = '';
  for (const endpoint of endpoints) {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: authorization, Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch {
      continue;
    }

    const result = await response.json().catch(() => null);
    const message = result?.message || result?.error || '';
    if (response.status === 404 || response.status === 405 || /no static resource/i.test(message)) {
      missingRouteMessage = message;
      continue;
    }

    if (!response.ok || result?.success === false) {
      return Response.json(
        { message: message || 'Unable to load bank profile.' },
        { status: response.status },
      );
    }

    return Response.json(result);
  }

  return Response.json(
    { message: missingRouteMessage || 'Unable to connect to the bank profile API.' },
    { status: missingRouteMessage ? 404 : 502 },
  );
}