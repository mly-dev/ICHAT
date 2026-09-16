/**
 * Pont socket → stores (ICH-022).
 *
 * Stratégie retenue :
 * 1. Le socket ne parle jamais aux écrans. Il n'appelle que des actions de
 *    store, qui sont toutes idempotentes.
 * 2. Déduplication par `id` et par `clientId` : un message envoyé par moi
 *    revient par socket, il doit remplacer la version optimiste, pas s'ajouter.
 * 3. Ordre garanti par l'horodatage serveur, pas par l'ordre d'arrivée : après
 *    une coupure les événements arrivent en vrac.
 * 4. Un statut ne redescend jamais (voir messageMerge).
 * 5. À chaque reconnexion, on ne fait pas confiance au socket pour ce qui a été
 *    manqué : on redemande par HTTP les messages postérieurs au dernier connu
 *    (`since`), pour tous les fils déjà ouverts.
 */
import { conversationsApi } from '@/services/api';
import { socketClient } from '@/services/socket/socketClient';
import { useConversationsStore } from '@/store/conversationsStore';
import { useMessagesStore } from '@/store/messagesStore';
import type { ConversationId } from '@/types/models';
import { logger } from '@/utils/logger';

let started = false;
let previousStatus: string | null = null;

/** Branche les abonnements. Appelé une fois au démarrage de l'app. */
export function startSocketSync(): () => void {
  if (started) return () => undefined;
  started = true;

  const unsubscribers = [
    socketClient.on('message:new', ({ message }) => {
      useMessagesStore.getState().applyIncoming(message);
    }),

    socketClient.on('message:updated', ({ message }) => {
      useMessagesStore.getState().applyIncoming(message);
    }),

    socketClient.on('message:deleted', ({ conversationId, messageId }) => {
      useMessagesStore.getState().applyDeleted(conversationId, messageId);
    }),

    socketClient.on('message:status', ({ conversationId, messageId, status }) => {
      useMessagesStore.getState().applyStatus(conversationId, messageId, status);
    }),

    socketClient.on('conversation:read', ({ conversationId, userId }) => {
      // Lecture faite depuis un autre appareil : on aligne le badge local.
      const me = useMessagesStore.getState().activeConversationId;
      if (userId) useConversationsStore.getState().markAsRead(conversationId);
      if (me === conversationId) useMessagesStore.getState().markThreadAsRead(conversationId);
    }),

    socketClient.on('conversation:updated', ({ conversationId, unreadCount }) => {
      if (typeof unreadCount === 'number') {
        useConversationsStore.getState().setUnreadCount(conversationId, unreadCount);
      }
    }),

    socketClient.on('group:updated', ({ conversationId, name }) => {
      const conversation = useConversationsStore
        .getState()
        .items.find((item) => item.id === conversationId);
      if (conversation && name) {
        useConversationsStore.getState().upsert({ ...conversation, title: name });
      }
    }),

    // Resynchronisation : c'est ici qu'on rattrape ce que le socket a manqué.
    socketClient.onStatusChange((status) => {
      const reconnected = status === 'connected' && previousStatus && previousStatus !== 'connected';
      previousStatus = status;
      if (!reconnected) return;
      void resyncAfterReconnect();
    }),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    started = false;
    previousStatus = null;
  };
}

/**
 * Après une coupure : on rafraîchit la liste (les aperçus et les non-lus ont pu
 * bouger) et on redemande les messages manquants de chaque fil déjà chargé.
 */
export async function resyncAfterReconnect(): Promise<void> {
  try {
    await useConversationsStore.getState().refresh();
  } catch (error) {
    logger.warn('socketSync', 'refresh conversations', error);
  }

  const { threads, resync } = useMessagesStore.getState();
  const openThreads = Object.entries(threads)
    .filter(([, thread]) => thread.items.length > 0)
    .map(([conversationId]) => conversationId);

  // En série : sur une connexion qui vient de revenir, lancer dix requêtes en
  // parallèle est le meilleur moyen de les faire toutes échouer.
  for (const conversationId of openThreads) {
    await resync(conversationId);
  }
}

/** Rejoint la « room » d'une conversation ouverte ; l'émission est mise en file si coupé. */
export function joinConversation(conversationId: ConversationId): void {
  socketClient.emit('conversation:join', { conversationId });
}

export function leaveConversation(conversationId: ConversationId): void {
  socketClient.emit('conversation:leave', { conversationId });
}

/**
 * ICH-026 : marque la conversation comme lue. On met à jour le badge tout de
 * suite (source de vérité unique dans conversationsStore), puis on prévient le
 * serveur ; un échec réseau ne doit pas laisser un badge fantôme à l'écran.
 */
export async function markConversationAsRead(
  conversationId: ConversationId,
  lastMessageId?: string
): Promise<void> {
  useConversationsStore.getState().markAsRead(conversationId);
  useMessagesStore.getState().markThreadAsRead(conversationId);
  socketClient.emit('conversation:read', { conversationId, lastMessageId });

  try {
    await conversationsApi.markAsRead(conversationId, lastMessageId);
  } catch (error) {
    logger.warn('socketSync', 'markAsRead', error);
  }
}
