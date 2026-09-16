/**
 * Notifications push côté app (ICH-052 à ICH-055).
 *
 * L'envoi est chez Ibou : ici on enregistre le device token, on reçoit, et on
 * route vers la bonne conversation. La couche native est derrière un adaptateur
 * (`src/services/native/push.js`), donc cette logique est testable sans
 * téléphone.
 */
import { Platform } from 'react-native';

import { notificationsApi } from '@/services/api';
import { push } from '@/services/native/push';
import { logger } from '@/utils/logger';

let registeredToken = null;

/** Normalise la charge utile reçue, quelle que soit sa forme. */
export function extractPayload(data) {
  if (!data || typeof data !== 'object') return {};
  return {
    conversationId: typeof data.conversationId === 'string' ? data.conversationId : undefined,
    messageId: typeof data.messageId === 'string' ? data.messageId : undefined,
    type: typeof data.type === 'string' ? data.type : undefined,
  };
}

/** ICH-052 : demande la permission et enregistre le token auprès du back. */
export async function registerForPushNotifications() {
  try {
    const status = await push.requestPermission();
    if (status !== 'granted') return null;

    const token = await push.getToken();
    if (!token || token === registeredToken) return token || null;

    await notificationsApi.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    registeredToken = token;
    return token;
  } catch (error) {
    // Une notification qui ne s'enregistre pas ne doit pas empêcher d'utiliser
    // l'app : on log et on continue.
    logger.warn('push', 'registration', error);
    return null;
  }
}

export async function unregisterPushNotifications() {
  if (!registeredToken) return;
  try {
    await notificationsApi.unregisterDevice(registeredToken);
  } catch (error) {
    logger.warn('push', 'unregister', error);
  } finally {
    registeredToken = null;
  }
}

/** ICH-054 : badge de l'icône de l'app, aligné sur le total des non-lus. */
export async function setAppBadgeCount(count) {
  try {
    await push.setBadgeCount(Math.max(0, count));
  } catch (error) {
    logger.warn('push', 'badge', error);
  }
}

export function __resetPushServiceForTests() {
  registeredToken = null;
}
