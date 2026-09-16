/**
 * Câblage des notifications au démarrage (ICH-052 à ICH-055).
 * Tout est regroupé ici pour que App.tsx reste lisible.
 */
import { openConversationById } from '@/navigation/openConversation';
import { selectTotalUnread, useConversationsStore } from '@/store/conversationsStore';
import { useMessagesStore } from '@/store/messagesStore';
import { logger } from '@/utils/logger';

import { notificationPreferences } from './preferences';
import {
  addPushListeners,
  configureForegroundHandler,
  getInitialPushPayload,
  registerForPushNotifications,
  setAppBadgeCount,
  type PushPayload,
} from './pushService';

export function startNotifications(): () => void {
  configureForegroundHandler(() => useMessagesStore.getState().activeConversationId);

  void notificationPreferences.load();
  void registerForPushNotifications();

  /** ICH-055 : deep-link vers la conversation concernée. */
  function openFromPayload(payload: PushPayload) {
    if (!payload.conversationId) return;
    openConversationById(payload.conversationId);
  }

  const removeListeners = addPushListeners(openFromPayload);

  // App ouverte depuis une notification alors qu'elle était fermée : la
  // navigation n'est pas encore prête, on laisse passer un tick.
  void getInitialPushPayload()
    .then((payload) => {
      if (payload) setTimeout(() => openFromPayload(payload), 300);
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
    removeListeners();
    unsubscribeBadge();
  };
}
