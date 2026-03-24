import { API_URL } from '../config/api';

export function buildApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(payload?.error || fallbackMessage);
}
