/**
 * Client HTTP de l'app.
 *
 * Responsabilités : URL de base, token (fourni par le hook d'auth d'Adam),
 * timeout, détection hors-ligne, normalisation des erreurs, rafraîchissement du
 * token sur 401 (une seule fois), et un réessai court sur erreur réseau.
 */
import { getAuthSnapshot } from '@/mocks';
import { logger } from '@/utils/logger';

import { apiConfig } from './config';
import { ApiError, errorFromStatus } from './errors';
import { isOnline } from './network';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Corps JSON ; ignoré si `formData` est fourni. */
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  /** Nombre de réessais sur erreur réseau/serveur (défaut 1). */
  retries?: number;
  /** Laisse passer l'appel même hors-ligne (utile pour les sondes). */
  allowOffline?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = apiConfig.baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!query) return `${base}${cleanPath}`;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return params.length ? `${base}${cleanPath}?${params.join('&')}` : `${base}${cleanPath}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rawRequest<T>(path: string, options: RequestOptions, attempt: number): Promise<T> {
  const {
    method = 'GET',
    body,
    formData,
    query,
    headers = {},
    timeout = apiConfig.timeout,
    signal,
    retries = 1,
    allowOffline = false,
  } = options;

  if (!allowOffline && !isOnline()) {
    throw new ApiError('offline', 'Pas de connexion réseau.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  // L'appelant peut annuler (ex. upload interrompu) sans casser le timeout.
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const token = await getAuthSnapshot().getAccessToken();
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  if (!formData && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    const payload = await parseBody(response);

    if (response.ok) return payload as T;

    if (response.status === 401 && attempt === 0) {
      // Le refresh appartient à Adam : on lui demande un token, puis on rejoue.
      const refreshed = await getAuthSnapshot().refreshAccessToken();
      if (refreshed) return rawRequest<T>(path, options, attempt + 1);
    }

    const apiError = errorFromStatus(response.status, payload);
    if (apiError.isRetryable && attempt < retries) {
      await delay(300 * 2 ** attempt);
      return rawRequest<T>(path, options, attempt + 1);
    }
    throw apiError;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const aborted = error instanceof Error && error.name === 'AbortError';
    if (aborted && signal?.aborted) throw new ApiError('unknown', 'Requête annulée.');
    if (aborted) {
      if (attempt < retries) {
        await delay(300 * 2 ** attempt);
        return rawRequest<T>(path, options, attempt + 1);
      }
      throw new ApiError('timeout', 'Délai dépassé.');
    }

    logger.warn('api', method, path, error);
    if (attempt < retries) {
      await delay(300 * 2 ** attempt);
      return rawRequest<T>(path, options, attempt + 1);
    }
    throw new ApiError('network', 'Connexion impossible.', undefined, error);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

export const apiClient = {
  request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return rawRequest<T>(path, options, 0);
  },
  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'GET' }, 0);
  },
  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'POST', body }, 0);
  },
  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'PATCH', body }, 0);
  },
  delete<T>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'DELETE' }, 0);
  },
};
