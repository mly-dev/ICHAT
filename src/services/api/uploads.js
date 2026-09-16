/**
 * Téléversement de pièces jointes (ICH-029 à ICH-033).
 *
 * XMLHttpRequest plutôt que fetch : c'est le seul moyen d'avoir une
 * progression d'upload en React Native, et sur une connexion lente une barre
 * de progression n'est pas un luxe.
 */
import { getAuthSnapshot } from '@/mocks';

import { apiConfig } from './config';
import { ApiError, errorFromStatus } from './errors';
import { endpoints } from './endpoints';
import { mockApi } from './mock';
import { isOnline } from './network';

export const uploadsApi = {
  upload(source, options = {}) {
    if (apiConfig.useMocks) return mockApi.upload(source, options);
    if (!isOnline()) return Promise.reject(new ApiError('offline', 'Pas de connexion réseau.'));

    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', { uri: source.uri, name: source.name, type: source.mimeType });

      const request = new XMLHttpRequest();
      request.open('POST', `${apiConfig.baseUrl.replace(/\/+$/, '')}${endpoints.uploads}`);
      request.timeout = Math.max(apiConfig.timeout, 60000); // un upload est long en 3G

      getAuthSnapshot()
        .getAccessToken()
        .then((token) => {
          if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
          request.send(form);
        })
        .catch(reject);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0 && options.onProgress) {
          options.onProgress(event.loaded / event.total);
        }
      };

      request.onload = () => {
        let payload = null;
        try {
          payload = JSON.parse(request.responseText);
        } catch (error) {
          payload = request.responseText;
        }
        if (request.status >= 200 && request.status < 300) resolve(payload);
        else reject(errorFromStatus(request.status, payload));
      };

      request.onerror = () => reject(new ApiError('network', 'Envoi interrompu.'));
      request.ontimeout = () =>
        reject(new ApiError('timeout', "Le fichier n'a pas pu être envoyé à temps."));
      request.onabort = () => reject(new ApiError('unknown', 'Envoi annulé.'));

      if (options.signal) options.signal.addEventListener('abort', () => request.abort());
    });
  },
};
