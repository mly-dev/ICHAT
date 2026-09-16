/**
 * Préférences de notification, exposées en service (ICH-056).
 *
 * L'écran Paramètres appartient à Adam (ICH-075) : il appellera ces fonctions,
 * je n'écris pas son écran. Le service garde une copie locale pour que l'app
 * sache quoi faire même hors-ligne, et la resynchronise dès que possible.
 */
import { notificationsApi } from '@/services/api';
import { storage } from '@/services/native/storage';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'ilimichat.notifications.preferences.v1';

export const DEFAULT_PREFERENCES = {
  enabled: true,
  directMessages: true,
  groupMessages: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

let cached = DEFAULT_PREFERENCES;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(cached));
}

export const notificationPreferences = {
  /** Valeur courante, sans appel réseau. */
  get() {
    return cached;
  },

  subscribe(listener) {
    listeners.add(listener);
    listener(cached);
    return () => listeners.delete(listener);
  },

  /** Charge depuis le téléphone puis, si possible, depuis le serveur. */
  async load() {
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw) {
        cached = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
        emit();
      }
    } catch (error) {
      logger.warn('notifications', 'load local', error);
    }

    try {
      const remote = await notificationsApi.getPreferences();
      cached = { ...DEFAULT_PREFERENCES, ...remote };
      await storage.setItem(STORAGE_KEY, JSON.stringify(cached));
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
  async update(patch) {
    const previous = cached;
    cached = { ...cached, ...patch };
    emit();

    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify(cached));
      const remote = await notificationsApi.updatePreferences(patch);
      cached = { ...cached, ...remote };
      await storage.setItem(STORAGE_KEY, JSON.stringify(cached));
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
  shouldNotify(kind) {
    if (!cached.enabled) return false;
    return kind === 'direct' ? cached.directMessages : cached.groupMessages;
  },

  async __resetForTests() {
    cached = DEFAULT_PREFERENCES;
    await storage.removeItem(STORAGE_KEY);
  },
};
