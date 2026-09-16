/** Endpoints « notifications » côté app (ICH-052, ICH-056). L'envoi est chez Ibou. */
import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export const notificationsApi = {
  /** ICH-052 : enregistre le device token auprès du back. */
  registerDevice(payload) {
    if (apiConfig.useMocks) return mockApi.registerDevice(payload);
    return apiClient.post(endpoints.devices, payload);
  },

  unregisterDevice(token) {
    if (apiConfig.useMocks) return mockApi.unregisterDevice(token);
    return apiClient.delete(endpoints.device(token));
  },

  /** ICH-056 : préférences serveur, lues aussi par l'écran Paramètres d'Adam. */
  getPreferences() {
    if (apiConfig.useMocks) return mockApi.getNotificationPreferences();
    return apiClient.get(endpoints.notificationPreferences);
  },

  updatePreferences(payload) {
    if (apiConfig.useMocks) return mockApi.updateNotificationPreferences(payload);
    return apiClient.patch(endpoints.notificationPreferences, payload);
  },
};
