/**
 * Préférences de notification, exposées en service (ICH-056).
 *
 * L'écran Paramètres appartient à Adam (ICH-075) : il appellera ces fonctions,
 * je n'écris pas son écran. Le service garde une copie locale pour que l'app
 * sache quoi faire même hors-ligne, et la resynchronise dès que possible.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { notificationsApi, type NotificationPreferencesDto } from '@/services/api';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'ilimichat.notifications.preferences.v1';

export type NotificationPreferences = NotificationPreferencesDto;

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  directMessages: true,
  groupMessages: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

let cached: NotificationPreferences = DEFAULT_PREFERENCES;
const listeners = new Set<(preferences: NotificationPreferences) => void>();

function emit() {
  listeners.forEach((listener) => listener(cached));
}

export const notificationPreferences = {
  /** Valeur courante, sans appel réseau. */
  get(): NotificationPreferences {
    return cached;
  },

  subscribe(listener: (preferences: NotificationPreferences) => void): () => void {
    listeners.add(listener);
    listener(cached);
    return () => listeners.delete(listener);
  },

  /** Charge depuis le téléphone puis, si possible, depuis le serveur. */
  async load(): Promise<NotificationPreferences> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        cached = { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as NotificationPreferences) };
        emit();
      }
    } catch (error) {
      logger.warn('notifications', 'load local', error);
    }

    try {
      const remote = await notificationsApi.getPreferences();
      cached = { ...DEFAULT_PREFERENCES, ...remote };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
      emit();
    } catch (error) {
      // Hors-ligne : on reste sur la valeur locale, c'est suffisant.
      logger.warn('notifications', 'load remote', error);
    }

    return cached;
  },

  /**
   * Met à jour les préférences. L'état local change tout de suite (l'interrupteur
   * doit répondre), le serveur suit ; en cas d'échec on revient en arrière.
   */
  async update(patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const previous = cached;
    cached = { ...cached, ...patch };
    emit();

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
      const remote = await notificationsApi.updatePreferences(patch);
      cached = { ...cached, ...remote };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
      emit();
    } catch (error) {
      logger.warn('notifications', 'update', error);
      cached = previous;
      emit();
      throw error;
    }

    return cached;
  },

  /** Utilisé par le routeur de notifications avant d'afficher une alerte. */
  shouldNotify(kind: 'direct' | 'group'): boolean {
    if (!cached.enabled) return false;
    return kind === 'direct' ? cached.directMessages : cached.groupMessages;
  },

  async __resetForTests(): Promise<void> {
    cached = DEFAULT_PREFERENCES;
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
