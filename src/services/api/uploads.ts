/** Téléversement de pièces jointes (ICH-029 à ICH-033). */
import type { MessageAttachment } from '@/types/models';

import { apiConfig } from './config';
import { ApiError, errorFromStatus } from './errors';
import { endpoints } from './endpoints';
import { mockApi } from './mock';
import { isOnline } from './network';
import { getAuthSnapshot } from '@/mocks';

export interface UploadSource {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface UploadOptions {
  /** Progression 0 → 1 ; XMLHttpRequest est le seul moyen fiable en RN. */
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export const uploadsApi = {
  upload(source: UploadSource, options: UploadOptions = {}): Promise<MessageAttachment> {
    if (apiConfig.useMocks) return mockApi.upload(source, options);
    if (!isOnline()) return Promise.reject(new ApiError('offline', 'Pas de connexion réseau.'));

    return new Promise<MessageAttachment>((resolve, reject) => {
      const form = new FormData();
      form.append('file', {
        uri: source.uri,
        name: source.name,
        type: source.mimeType,
      } as unknown as Blob);

      const request = new XMLHttpRequest();
      request.open('POST', `${apiConfig.baseUrl.replace(/\/+$/, '')}${endpoints.uploads}`);
      request.timeout = Math.max(apiConfig.timeout, 60000); // un upload est long en 3G

      void getAuthSnapshot()
        .getAccessToken()
        .then((token) => {
          if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
          request.send(form);
        })
        .catch(reject);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          options.onProgress?.(event.loaded / event.total);
        }
      };

      request.onload = () => {
        let payload: unknown = null;
        try {
          payload = JSON.parse(request.responseText);
        } catch {
          payload = request.responseText;
        }
        if (request.status >= 200 && request.status < 300) {
          resolve(payload as MessageAttachment);
        } else {
          reject(errorFromStatus(request.status, payload));
        }
      };

      request.onerror = () => reject(new ApiError('network', 'Envoi interrompu.'));
      request.ontimeout = () => reject(new ApiError('timeout', "Le fichier n'a pas pu être envoyé à temps."));
      request.onabort = () => reject(new ApiError('unknown', 'Envoi annulé.'));

      options.signal?.addEventListener('abort', () => request.abort());
    });
  },
};
