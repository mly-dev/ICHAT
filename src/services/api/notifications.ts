/** Endpoints « notifications » côté app (ICH-052, ICH-056). L'envoi est chez Ibou. */
import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export interface RegisterDevicePayload {
  token: string;
  platform: 'ios' | 'android';
  deviceName?: string;
  appVersion?: string;
}

export interface NotificationPreferencesDto {
  enabled: boolean;
  directMessages: boolean;
  groupMessages: boolean;
  /** Heures calmes, format « HH:mm » ; null = désactivé. */
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export const notificationsApi = {
  /** ICH-052 : enregistre le device token auprès du back. */
  async registerDevice(payload: RegisterDevicePayload): Promise<void> {
    if (apiConfig.useMocks) return mockApi.registerDevice(payload);
    await apiClient.post<void>(endpoints.devices, payload);
  },

  async unregisterDevice(token: string): Promise<void> {
    if (apiConfig.useMocks) return mockApi.unregisterDevice(token);
    await apiClient.delete<void>(endpoints.device(token));
  },

  /** ICH-056 : préférences serveur, consommées aussi par l'écran Paramètres d'Adam. */
  async getPreferences(): Promise<NotificationPreferencesDto> {
    if (apiConfig.useMocks) return mockApi.getNotificationPreferences();
    return apiClient.get<NotificationPreferencesDto>(endpoints.notificationPreferences);
  },

  async updatePreferences(
    payload: Partial<NotificationPreferencesDto>
  ): Promise<NotificationPreferencesDto> {
    if (apiConfig.useMocks) return mockApi.updateNotificationPreferences(payload);
    return apiClient.patch<NotificationPreferencesDto>(endpoints.notificationPreferences, payload);
  },
};
