/**
 * Pont socket → stores (ICH-022).
 *
 * Stratégie retenue :
 * 1. Le socket ne parle jamais aux écrans. Il n'appelle que des actions de
 *    store, toutes idempotentes.
 * 2. Déduplication par `id` et par `clientId` : un message que j'envoie me
 *    revient par socket, il doit remplacer la version optimiste, pas s'ajouter.
 * 3. L'ordre vient de l'horodatage serveur, pas de l'ordre d'arrivée : après une
 *    coupure les événements arrivent en vrac.
 * 4. Un statut ne redescend jamais (voir messageMerge).
 * 5. À chaque reconnexion, on ne fait pas confiance au socket pour ce qu'il a
 *    manqué : on redemande par HTTP les messages postérieurs au dernier connu.
 */
import { conversationsApi } from '@/services/api';
import { socketClient } from '@/services/socket/socketClient';
import { ClientEvents, ServerEvents, SocketStatus } from '@/services/socket/events';
import { useConversationsStore } from '@/store/conversationsStore';
import { useMessagesStore } from '@/store/messagesStore';
import { logger } from '@/utils/logger';

let started = false;
let previousStatus = null;

export function startSocketSync() {
  if (started) return () => {};
  started = true;

  const unsubscribers = [
    socketClient.on(ServerEvents.MESSAGE_NEW, (payload) => {
      if (payload && payload.message) useMessagesStore.getState().applyIncoming(payload.message);
    }),

    socketClient.on(ServerEvents.MESSAGE_UPDATED, (payload) => {
      if (payload && payload.message) useMessagesStore.getState().applyIncoming(payload.message);
    }),

    socketClient.on(ServerEvents.MESSAGE_DELETED, (payload) => {
      if (!payload) return;
      useMessagesStore.getState().applyDeleted(payload.conversationId, payload.messageId);
    }),

    socketClient.on(ServerEvents.MESSAGE_STATUS, (payload) => {
      if (!payload) return;
      useMessagesStore
        .getState()
        .applyStatus(payload.conversationId, payload.messageId, payload.status);
    }),

    socketClient.on(ServerEvents.CONVERSATION_READ, (payload) => {
      if (!payload) return;
      // Lecture faite depuis un autre appareil : on aligne le badge local.
      useConversationsStore.getState().markAsRead(payload.conversationId);
      if (useMessagesStore.getState().activeConversationId === payload.conversationId) {
        useMessagesStore.getState().markThreadAsRead(payload.conversationId);
      }
    }),

    socketClient.on(ServerEvents.CONVERSATION_UPDATED, (payload) => {
      if (!payload || typeof payload.unreadCount !== 'number') return;
      useConversationsStore.getState().setUnreadCount(payload.conversationId, payload.unreadCount);
    }),

    socketClient.on(ServerEvents.GROUP_UPDATED, (payload) => {
      if (!payload || !payload.name) return;
      const conversation = useConversationsStore
        .getState()
        .items.find((item) => item.id === payload.conversationId);
      if (conversation) {
        useConversationsStore.getState().upsert({ ...conversation, title: payload.name });
      }
    }),

    // Resynchronisation : c'est ici qu'on rattrape ce que le socket a manqué.
    socketClient.onStatusChange((status) => {
      const reconnected =
        status === SocketStatus.CONNECTED && previousStatus && previousStatus !== SocketStatus.CONNECTED;
      previousStatus = status;
      if (reconnected) void resyncAfterReconnect();
    }),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    started = false;
    previousStatus = null;
  };
}

/**
 * Après une coupure : on rafraîchit la liste (aperçus et non-lus ont pu bouger)
 * et on redemande les messages manquants de chaque fil déjà chargé.
 */
export async function resyncAfterReconnect() {
  try {
    await useConversationsStore.getState().refresh();
  } catch (error) {
    logger.warn('socketSync', 'refresh conversations', error);
  }

  const { threads, resync } = useMessagesStore.getState();
  const openThreads = Object.keys(threads).filter((id) => threads[id].items.length > 0);

  // En série : sur une connexion qui vient de revenir, lancer dix requêtes en
  // parallèle est le meilleur moyen de les faire toutes échouer.
  for (const conversationId of openThreads) {
    await resync(conversationId);
  }
}

export function joinConversation(conversationId) {
  socketClient.emit(ClientEvents.CONVERSATION_JOIN, { conversationId });
}

export function leaveConversation(conversationId) {
  socketClient.emit(ClientEvents.CONVERSATION_LEAVE, { conversationId });
}

/**
 * ICH-026 : marque la conversation comme lue. Le badge est mis à jour tout de
 * suite (source de vérité unique dans conversationsStore), puis on prévient le
 * serveur ; un échec réseau ne doit pas laisser un badge fantôme à l'écran.
 */
export async function markConversationAsRead(conversationId, lastMessageId) {
  useConversationsStore.getState().markAsRead(conversationId);
  useMessagesStore.getState().markThreadAsRead(conversationId);
  socketClient.emit(ClientEvents.CONVERSATION_READ, { conversationId, lastMessageId });

  try {
    await conversationsApi.markAsRead(conversationId, lastMessageId);
  } catch (error) {
    logger.warn('socketSync', 'markAsRead', error);
  }
}
