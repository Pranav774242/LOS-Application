const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const endpoints = ['/api/v1/loan-products', '/api/v1/masters/loan-products'];

export async function GET(request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ message: 'Sign in to load loan products.' }, { status: 401 });
  }

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: authorization, Accept: 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) return Response.json(await response.json());
      if (response.status === 404 || response.status === 405) continue;

      const result = await response.json().catch(() => null);
      return Response.json(
        { message: result?.message || 'Unable to load loan products from the backend.' },
        { status: response.status },
      );
    } catch {
      continue;
    }
  }

  return Response.json({ message: 'Unable to load loan products from the backend.' }, { status: 502 });
}