/**
 * Notifications push côté app (ICH-052 à ICH-055).
 *
 * L'envoi est chez Ibou : ici on enregistre le device token, on reçoit, et on
 * route vers la bonne conversation. Rien de plus.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationsApi } from '@/services/api';
import type { ConversationId } from '@/types/models';
import { logger } from '@/utils/logger';

import { notificationPreferences } from './preferences';

export interface PushPayload {
  conversationId?: ConversationId;
  messageId?: string;
  type?: 'message' | 'group' | string;
}

export type PushOpenHandler = (payload: PushPayload) => void;

let registeredToken: string | null = null;

/**
 * Comportement en premier plan (ICH-053) : on n'affiche pas de bannière quand
 * l'utilisateur est déjà dans la conversation concernée — c'est la première
 * chose qui agace sur une messagerie.
 */
export function configureForegroundHandler(getActiveConversationId: () => ConversationId | null): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const payload = extractPayload(notification.request.content.data);
      const isActive =
        !!payload.conversationId && payload.conversationId === getActiveConversationId();
      const kind = payload.type === 'group' ? 'group' : 'direct';
      const allowed = notificationPreferences.shouldNotify(kind) && !isActive;

      return {
        shouldShowBanner: allowed,
        shouldShowList: allowed,
        shouldPlaySound: allowed,
        shouldSetBadge: false, // le badge vient du compteur de non-lus, pas d'ici
      };
    },
  });
}

/** ICH-052 : demande la permission et enregistre le token auprès du back. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.debug('push', 'émulateur : pas de token push');
    return null;
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token || token === registeredToken) return token ?? null;

    await notificationsApi.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceName: Device.modelName ?? undefined,
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

export async function unregisterPushNotifications(): Promise<void> {
  if (!registeredToken) return;
  try {
    await notificationsApi.unregisterDevice(registeredToken);
  } catch (error) {
    logger.warn('push', 'unregister', error);
  } finally {
    registeredToken = null;
  }
}

/**
 * ICH-053 / ICH-055 : réception en premier plan et en arrière-plan, et
 * ouverture de la bonne conversation au tap.
 */
export function addPushListeners(onOpen: PushOpenHandler): () => void {
  const received = Notifications.addNotificationReceivedListener(() => {
    // Le contenu réel arrive par socket ; la notification ne sert qu'à réveiller.
  });

  const responded = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen(extractPayload(response.notification.request.content.data));
  });

  return () => {
    received.remove();
    responded.remove();
  };
}

/** App lancée depuis une notification alors qu'elle était fermée. */
export async function getInitialPushPayload(): Promise<PushPayload | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    return extractPayload(response.notification.request.content.data);
  } catch (error) {
    logger.warn('push', 'initial payload', error);
    return null;
  }
}

/** ICH-054 : badge de l'icône de l'app, aligné sur le total des non-lus. */
export async function setAppBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (error) {
    logger.warn('push', 'badge', error);
  }
}

function extractPayload(data: unknown): PushPayload {
  if (!data || typeof data !== 'object') return {};
  const record = data as Record<string, unknown>;
  return {
    conversationId: typeof record.conversationId === 'string' ? record.conversationId : undefined,
    messageId: typeof record.messageId === 'string' ? record.messageId : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
  };
}
