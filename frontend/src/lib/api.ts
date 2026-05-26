const BASE = typeof window !== 'undefined'
  ? (import.meta.env.VITE_API_URL ?? 'http://localhost:3000')
  : 'http://localhost:3000';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Erro ${res.status}`);
  }
  return res.json();
}

export const api = {
  get:    <T>(path: string)                => req<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => req<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown) => req<T>('PUT',    path, body),
  delete: <T>(path: string)               => req<T>('DELETE', path),
};