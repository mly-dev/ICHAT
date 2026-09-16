/**
 * Store des messages, par conversation (ICH-020 à ICH-028).
 *
 * Principe : l'écran affiche toujours l'état local, et le réseau vient le
 * corriger. Un message part d'abord en `pending` à l'écran, la file d'envoi
 * s'occupe du reste ; c'est la seule façon d'avoir une app utilisable sur une
 * connexion qui tombe toutes les deux minutes.
 */
import { getCurrentUserId } from '@/mocks';
import { messagesApi, toUserMessage } from '@/services/api';
import { outbox } from '@/services/outbox';
import { createClientId } from '@/utils/ids';
import { logger } from '@/utils/logger';

import { useConversationsStore } from './conversationsStore';
import { createStore } from './createStore';
import { lastMessageDate, mergeMessages, upsertMessage } from './messageMerge';

const EMPTY_THREAD = {
  items: [],
  status: 'idle',
  error: null,
  loadingOlder: false,
  hasMore: false,
  nextCursor: null,
  syncedAt: null,
};

export const useMessagesStore = createStore((set, get) => {
  function threadOf(conversationId) {
    return get().threads[conversationId] || EMPTY_THREAD;
  }

  function patchThread(conversationId, patch) {
    const { threads } = get();
    set({
      threads: {
        ...threads,
        [conversationId]: { ...(threads[conversationId] || EMPTY_THREAD), ...patch },
      },
    });
  }

  /** Ajoute le message à l'écran puis à la file d'envoi. */
  async function enqueueOptimistic(conversationId, kind, { text, replyToId, attachments } = {}) {
    const clientId = createClientId();
    const me = getCurrentUserId() || 'me';
    const thread = threadOf(conversationId);
    const replySource = replyToId
      ? thread.items.find((message) => message.id === replyToId)
      : undefined;

    const optimistic = {
      id: clientId,
      conversationId,
      senderId: me,
      senderName: 'Moi',
      kind,
      text,
      attachments,
      replyTo: replySource
        ? {
            id: replySource.id,
            senderId: replySource.senderId,
            senderName: replySource.senderName,
            preview:
              replySource.text || (replySource.kind === 'image' ? '📷 Photo' : '📎 Fichier'),
            kind: replySource.kind,
          }
        : null,
      createdAt: new Date().toISOString(),
      status: 'pending',
      clientId,
    };

    patchThread(conversationId, { items: upsertMessage(thread.items, optimistic) });
    useConversationsStore.getState().applyMessage(optimistic, { fromMe: true });

    await outbox.enqueue({
      conversationId,
      kind,
      text,
      attachmentIds: attachments ? attachments.map((attachment) => attachment.id) : undefined,
      replyToId: replyToId || null,
      clientId,
    });
  }

  return {
    threads: {},
    /** Conversation ouverte : sert à ne pas incrémenter les non-lus à l'écran. */
    activeConversationId: null,

    setActiveConversation(conversationId) {
      set({ activeConversationId: conversationId });
    },

    async loadInitial(conversationId, { force = false } = {}) {
      const thread = threadOf(conversationId);
      if (!force && (thread.status === 'loading' || thread.items.length)) {
        // Fil déjà en mémoire : on rattrape le retard, sans tout retélécharger.
        void get().resync(conversationId);
        return;
      }

      patchThread(conversationId, { status: 'loading', error: null });
      try {
        const page = await messagesApi.list({ conversationId });
        patchThread(conversationId, {
          items: mergeMessages(thread.items, page.items),
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          status: 'ready',
          error: null,
          syncedAt: new Date().toISOString(),
        });
      } catch (error) {
        logger.warn('messages', 'loadInitial', error);
        patchThread(conversationId, { status: 'error', error: toUserMessage(error) });
      }
    },

    /** ICH-023 : scroll inverse, on remonte l'historique page par page. */
    async loadOlder(conversationId) {
      const thread = threadOf(conversationId);
      if (!thread.hasMore || thread.loadingOlder || !thread.nextCursor) return;

      patchThread(conversationId, { loadingOlder: true });
      try {
        const page = await messagesApi.list({ conversationId, cursor: thread.nextCursor });
        patchThread(conversationId, {
          items: mergeMessages(threadOf(conversationId).items, page.items),
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        });
      } catch (error) {
        logger.warn('messages', 'loadOlder', error);
        patchThread(conversationId, { error: toUserMessage(error) });
      } finally {
        patchThread(conversationId, { loadingOlder: false });
      }
    },

    /** Rattrape ce qui a été manqué pendant une coupure (ICH-022). */
    async resync(conversationId) {
      const thread = threadOf(conversationId);
      const confirmed = thread.items.filter((message) => message.status !== 'pending');
      const since = lastMessageDate(confirmed);
      if (!since) return;

      try {
        const page = await messagesApi.list({ conversationId, since });
        if (!page.items.length) {
          patchThread(conversationId, { syncedAt: new Date().toISOString() });
          return;
        }
        patchThread(conversationId, {
          items: mergeMessages(threadOf(conversationId).items, page.items),
          syncedAt: new Date().toISOString(),
          error: null,
        });
      } catch (error) {
        logger.warn('messages', 'resync', error);
      }
    },

    /** ICH-020 / ICH-027 : envoi optimiste, avec citation éventuelle. */
    async sendText(conversationId, text, replyToId = null) {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      await enqueueOptimistic(conversationId, 'text', { text: trimmed, replyToId });
    },

    /** ICH-029 / ICH-032 : la pièce jointe est déjà téléversée. */
    async sendAttachment(conversationId, attachment, { text, replyToId = null } = {}) {
      await enqueueOptimistic(conversationId, attachment.kind === 'image' ? 'image' : 'file', {
        text,
        replyToId,
        attachments: [attachment],
      });
    },

    async retryMessage(conversationId, clientId) {
      const thread = threadOf(conversationId);
      const target = thread.items.find((message) => message.clientId === clientId);
      if (!target) return;

      patchThread(conversationId, {
        items: upsertMessage(thread.items, { ...target, status: 'pending' }),
      });
      await outbox.retryNow(clientId);
    },

    /** ICH-028 : suppression, optimiste elle aussi. */
    async deleteMessage(conversationId, messageId) {
      const thread = threadOf(conversationId);
      const target = thread.items.find((message) => message.id === messageId);
      if (!target) return;

      patchThread(conversationId, {
        items: upsertMessage(thread.items, {
          ...target,
          deletedAt: new Date().toISOString(),
          text: undefined,
          attachments: undefined,
        }),
      });

      try {
        await messagesApi.remove(conversationId, messageId);
      } catch (error) {
        logger.warn('messages', 'delete', error);
        // Échec : on remet le message. Mieux vaut un message qui réapparaît
        // qu'un message qu'on croit supprimé alors qu'il est encore chez l'autre.
        // `deletedAt: null` explicite : sans lui la fusion garde la marque de
        // suppression, puisque le message d'origine n'a pas ce champ.
        patchThread(conversationId, {
          items: upsertMessage(threadOf(conversationId).items, { ...target, deletedAt: null }),
          error: toUserMessage(error),
        });
      }
    },

    applyIncoming(message) {
      const thread = threadOf(message.conversationId);
      const isActive = get().activeConversationId === message.conversationId;
      const fromMe = message.senderId === getCurrentUserId();

      patchThread(message.conversationId, { items: upsertMessage(thread.items, message) });
      useConversationsStore.getState().applyMessage(message, { fromMe, isActive });
    },

    applyStatus(conversationId, messageId, status) {
      const thread = threadOf(conversationId);
      const target = thread.items.find((message) => message.id === messageId);
      if (!target) return;
      patchThread(conversationId, {
        items: upsertMessage(thread.items, { ...target, status }),
      });
    },

    applyDeleted(conversationId, messageId) {
      const thread = threadOf(conversationId);
      const target = thread.items.find((message) => message.id === messageId);
      if (!target) return;
      patchThread(conversationId, {
        items: upsertMessage(thread.items, {
          ...target,
          deletedAt: new Date().toISOString(),
          text: undefined,
          attachments: undefined,
        }),
      });
    },

    markThreadAsRead(conversationId) {
      const thread = threadOf(conversationId);
      const me = getCurrentUserId();
      patchThread(conversationId, {
        items: thread.items.map((message) =>
          message.senderId !== me && message.status !== 'read'
            ? { ...message, status: 'read' }
            : message
        ),
      });
    },

    reset() {
      set({ threads: {}, activeConversationId: null });
    },
  };
});

/**
 * Branche la file d'envoi sur le store. Appelé une fois au démarrage : c'est ce
 * qui fait passer un message de « en cours » à « envoyé » ou « échec ».
 */
export function connectOutboxToStore() {
  const offSent = outbox.onSent((message, clientId) => {
    useMessagesStore.getState().applyIncoming({ ...message, clientId });
  });

  const offFailed = outbox.onFailed((clientId) => {
    const { threads } = useMessagesStore.getState();
    for (const conversationId of Object.keys(threads)) {
      const thread = threads[conversationId];
      const target = thread.items.find((message) => message.clientId === clientId);
      if (!target) continue;

      useMessagesStore.setState({
        threads: {
          ...threads,
          [conversationId]: {
            ...thread,
            items: upsertMessage(thread.items, { ...target, status: 'failed' }),
          },
        },
      });
      break;
    }
  });

  return () => {
    offSent();
    offFailed();
  };
}

export function selectThread(state, conversationId) {
  return state.threads[conversationId] || EMPTY_THREAD;
}
