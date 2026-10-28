/** Optional public backend URL for deployments where frontend and backend are hosted separately. Never put secrets in VITE_* variables. */
const backendBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export function apiUrl(path: string): string {
  return `${backendBase}${path.startsWith('/') ? path : `/${path}`}`;
}
