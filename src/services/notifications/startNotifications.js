/**
 * Câblage des notifications au démarrage (ICH-052 à ICH-055).
 * Tout est regroupé ici pour que App.jsx reste lisible.
 */
import { openConversationById } from '@/navigation/openConversation';
import { push } from '@/services/native/push';
import { selectTotalUnread, useConversationsStore } from '@/store/conversationsStore';
import { useMessagesStore } from '@/store/messagesStore';
import { logger } from '@/utils/logger';

import { notificationPreferences } from './preferences';
import { extractPayload, registerForPushNotifications, setAppBadgeCount } from './pushService';

export function startNotifications() {
  void notificationPreferences.load();
  void registerForPushNotifications();

  /** ICH-055 : deep-link vers la conversation concernée. */
  function openFromPayload(payload) {
    if (!payload || !payload.conversationId) return;
    openConversationById(payload.conversationId);
  }

  /**
   * ICH-053 : en premier plan, aucune bannière si l'utilisateur est déjà dans la
   * conversation concernée — c'est la première chose qui agace sur une
   * messagerie. Le contenu réel arrive par socket ; la notification ne sert
   * qu'à signaler.
   */
  const offMessage = push.onMessage((remoteMessage) => {
    const payload = extractPayload(remoteMessage && remoteMessage.data);
    const isActive =
      !!payload.conversationId &&
      payload.conversationId === useMessagesStore.getState().activeConversationId;
    const kind = payload.type === 'group' ? 'group' : 'direct';

    if (isActive || !notificationPreferences.shouldNotify(kind)) return;
    void push.displayLocalNotification(remoteMessage);
  });

  const offOpened = push.onNotificationOpened((remoteMessage) => {
    openFromPayload(extractPayload(remoteMessage && remoteMessage.data));
  });

  const offTokenRefresh = push.onTokenRefresh(() => {
    void registerForPushNotifications();
  });

  // App ouverte depuis une notification alors qu'elle était fermée : la
  // navigation n'est pas encore prête, on laisse passer un tick.
  void push
    .getInitialNotification()
    .then((remoteMessage) => {
      if (!remoteMessage) return;
      const payload = extractPayload(remoteMessage.data);
      setTimeout(() => openFromPayload(payload), 300);
    })
    .catch((error) => logger.warn('notifications', 'initial payload', error));

  /** ICH-054 : le badge de l'icône suit le total des non-lus, une seule source. */
  let lastBadge = -1;
  const unsubscribeBadge = useConversationsStore.subscribe((state) => {
    const total = selectTotalUnread(state);
    if (total === lastBadge) return;
    lastBadge = total;
    void setAppBadgeCount(total);
  });

  return () => {
    offMessage();
    offOpened();
    offTokenRefresh();
    unsubscribeBadge();
  };
}
