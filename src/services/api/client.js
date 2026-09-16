/**
 * Client HTTP de l'app.
 *
 * Responsabilités : URL de base, token (fourni par le module d'auth d'Adam),
 * timeout, détection hors-ligne, normalisation des erreurs, rafraîchissement du
 * token sur 401 (une seule fois), et un réessai court sur erreur réseau.
 */
import { getAuthSnapshot } from '@/mocks';
import { logger } from '@/utils/logger';

import { apiConfig } from './config';
import { ApiError, errorFromStatus } from './errors';
import { isOnline, reportNetworkFailure, reportNetworkSuccess } from './network';

function buildUrl(path, query) {
  const base = apiConfig.baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!query) return `${base}${cleanPath}`;

  const params = Object.keys(query)
    .filter((key) => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`);

  return params.length ? `${base}${cleanPath}?${params.join('&')}` : `${base}${cleanPath}`;
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  try {
    return contentType.includes('application/json') ? await response.json() : await response.text();
  } catch (error) {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rawRequest(path, options, attempt) {
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
  if (signal) signal.addEventListener('abort', onExternalAbort);

  const token = await getAuthSnapshot().getAccessToken();
  const finalHeaders = { Accept: 'application/json', ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (!formData && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    // Le serveur a répondu : la ligne est bonne, quel que soit le code HTTP.
    reportNetworkSuccess();

    const payload = await parseBody(response);
    if (response.ok) return payload;

    if (response.status === 401 && attempt === 0) {
      // Le refresh appartient à Adam : on lui demande un token, puis on rejoue.
      const refreshed = await getAuthSnapshot().refreshAccessToken();
      if (refreshed) return rawRequest(path, options, attempt + 1);
    }

    const apiError = errorFromStatus(response.status, payload);
    if (apiError.isRetryable && attempt < retries) {
      await delay(300 * 2 ** attempt);
      return rawRequest(path, options, attempt + 1);
    }
    throw apiError;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const aborted = error && error.name === 'AbortError';
    if (aborted && signal && signal.aborted) throw new ApiError('unknown', 'Requête annulée.');

    if (aborted) {
      if (attempt < retries) {
        await delay(300 * 2 ** attempt);
        return rawRequest(path, options, attempt + 1);
      }
      throw new ApiError('timeout', 'Délai dépassé.');
    }

    logger.warn('api', method, path, error);
    reportNetworkFailure();

    if (attempt < retries) {
      await delay(300 * 2 ** attempt);
      return rawRequest(path, options, attempt + 1);
    }
    throw new ApiError('network', 'Connexion impossible.', undefined, error);
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export const apiClient = {
  request: (path, options = {}) => rawRequest(path, options, 0),
  get: (path, options = {}) => rawRequest(path, { ...options, method: 'GET' }, 0),
  post: (path, body, options = {}) => rawRequest(path, { ...options, method: 'POST', body }, 0),
  patch: (path, body, options = {}) => rawRequest(path, { ...options, method: 'PATCH', body }, 0),
  delete: (path, options = {}) => rawRequest(path, { ...options, method: 'DELETE' }, 0),
};
