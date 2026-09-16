/**
 * Store des messages, par conversation (ICH-020 à ICH-028).
 *
 * Principe : l'écran affiche toujours l'état local, et le réseau vient le
 * corriger. Un message part d'abord en `pending` à l'écran, la file d'envoi
 * s'occupe du reste ; c'est la seule façon d'avoir une app utilisable sur une
 * connexion qui tombe toutes les deux minutes.
 */
import { create } from 'zustand';

import { getCurrentUserId } from '@/mocks';
import { messagesApi, toUserMessage } from '@/services/api';
import { outbox } from '@/services/outbox';
import type {
  ConversationId,
  Message,
  MessageAttachment,
  MessageId,
  MessageKind,
  MessageStatus,
} from '@/types/models';
import { createClientId } from '@/utils/ids';
import { logger } from '@/utils/logger';

import { useConversationsStore } from './conversationsStore';
import { lastMessageDate, mergeMessages, upsertMessage } from './messageMerge';

export interface ConversationThread {
  items: Message[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadingOlder: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  /** Dernière fois que le fil a été synchronisé avec le serveur. */
  syncedAt: string | null;
}

const EMPTY_THREAD: ConversationThread = {
  items: [],
  status: 'idle',
  error: null,
  loadingOlder: false,
  hasMore: false,
  nextCursor: null,
  syncedAt: null,
};

interface MessagesState {
  threads: Record<ConversationId, ConversationThread>;
  /** Conversation ouverte : sert à ne pas incrémenter les non-lus à l'écran. */
  activeConversationId: ConversationId | null;

  setActiveConversation: (conversationId: ConversationId | null) => void;
  loadInitial: (conversationId: ConversationId, options?: { force?: boolean }) => Promise<void>;
  loadOlder: (conversationId: ConversationId) => Promise<void>;
  /** Rattrape ce qui a été manqué pendant une coupure (ICH-022). */
  resync: (conversationId: ConversationId) => Promise<void>;

  sendText: (
    conversationId: ConversationId,
    text: string,
    replyToId?: MessageId | null
  ) => Promise<void>;
  sendAttachment: (
    conversationId: ConversationId,
    attachment: MessageAttachment,
    options?: { text?: string; replyToId?: MessageId | null }
  ) => Promise<void>;
  retryMessage: (conversationId: ConversationId, clientId: string) => Promise<void>;
  deleteMessage: (conversationId: ConversationId, messageId: MessageId) => Promise<void>;

  applyIncoming: (message: Message) => void;
  applyStatus: (conversationId: ConversationId, messageId: MessageId, status: MessageStatus) => void;
  applyDeleted: (conversationId: ConversationId, messageId: MessageId) => void;
  markThreadAsRead: (conversationId: ConversationId) => void;
  reset: () => void;
}

function threadOf(state: MessagesState, conversationId: ConversationId): ConversationThread {
  return state.threads[conversationId] ?? EMPTY_THREAD;
}

export const useMessagesStore = create<MessagesState>((set, get) => {
  function patchThread(conversationId: ConversationId, patch: Partial<ConversationThread>) {
    set((state) => ({
      threads: {
        ...state.threads,
        [conversationId]: { ...threadOf(state, conversationId), ...patch },
      },
    }));
  }

  return {
    threads: {},
    activeConversationId: null,

    setActiveConversation(conversationId) {
      set({ activeConversationId: conversationId });
    },

    async loadInitial(conversationId, { force = false } = {}) {
      const thread = threadOf(get(), conversationId);
      if (!force && (thread.status === 'loading' || thread.items.length)) {
        // Fil déjà en mémoire : on rattrape juste le retard, sans tout retélécharger.
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
      const thread = threadOf(get(), conversationId);
      if (!thread.hasMore || thread.loadingOlder || !thread.nextCursor) return;

      patchThread(conversationId, { loadingOlder: true });
      try {
        const page = await messagesApi.list({ conversationId, cursor: thread.nextCursor });
        const current = threadOf(get(), conversationId);
        patchThread(conversationId, {
          items: mergeMessages(current.items, page.items),
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

    async resync(conversationId) {
      const thread = threadOf(get(), conversationId);
      const since = lastMessageDate(thread.items.filter((message) => !message.clientId || message.status !== 'pending'));
      if (!since) return;

      try {
        const page = await messagesApi.list({ conversationId, since });
        if (!page.items.length) {
          patchThread(conversationId, { syncedAt: new Date().toISOString() });
          return;
        }
        const current = threadOf(get(), conversationId);
        patchThread(conversationId, {
          items: mergeMessages(current.items, page.items),
          syncedAt: new Date().toISOString(),
          error: null,
        });
      } catch (error) {
        logger.warn('messages', 'resync', error);
      }
    },

    /** ICH-020 / ICH-027 : envoi optimiste, avec citation éventuelle. */
    async sendText(conversationId, text, replyToId = null) {
      const trimmed = text.trim();
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
      const thread = threadOf(get(), conversationId);
      const target = thread.items.find((message) => message.clientId === clientId);
      if (!target) return;

      patchThread(conversationId, {
        items: upsertMessage(thread.items, { ...target, status: 'pending' }),
      });
      await outbox.retryNow(clientId);
    },

    /** ICH-028 : suppression, optimiste elle aussi. */
    async deleteMessage(conversationId, messageId) {
      const thread = threadOf(get(), conversationId);
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
        // Échec : on remet le message, mieux vaut un message qui réapparaît
        // qu'un message qu'on croit supprimé alors qu'il est encore chez l'autre.
        const current = threadOf(get(), conversationId);
        patchThread(conversationId, {
          items: upsertMessage(current.items, target),
          error: toUserMessage(error),
        });
      }
    },

    applyIncoming(message) {
      const state = get();
      const thread = threadOf(state, message.conversationId);
      const isActive = state.activeConversationId === message.conversationId;
      const fromMe = message.senderId === getCurrentUserId();

      // Rien à faire si on connaît déjà ce message dans une version au moins
      // aussi avancée : upsertMessage s'en charge, y compris pour le statut.
      patchThread(message.conversationId, {
        items: upsertMessage(thread.items, message),
      });

      useConversationsStore.getState().applyMessage(message, { fromMe, isActive });
    },

    applyStatus(conversationId, messageId, status) {
      const thread = threadOf(get(), conversationId);
      const target = thread.items.find((message) => message.id === messageId);
      if (!target) return;
      patchThread(conversationId, {
        items: upsertMessage(thread.items, { ...target, status }),
      });
    },

    applyDeleted(conversationId, messageId) {
      const thread = threadOf(get(), conversationId);
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
      const thread = threadOf(get(), conversationId);
      const me = getCurrentUserId();
      const updated = thread.items.map((message) =>
        message.senderId !== me && message.status !== 'read' ? { ...message, status: 'read' as const } : message
      );
      patchThread(conversationId, { items: updated });
    },

    reset() {
      set({ threads: {}, activeConversationId: null });
    },
  };

  /** Ajoute le message à l'écran puis à la file d'envoi. */
  async function enqueueOptimistic(
    conversationId: ConversationId,
    kind: MessageKind,
    {
      text,
      replyToId,
      attachments,
    }: { text?: string; replyToId?: MessageId | null; attachments?: MessageAttachment[] }
  ): Promise<void> {
    const clientId = createClientId();
    const me = getCurrentUserId() ?? 'me';
    const thread = threadOf(get(), conversationId);
    const replySource = replyToId
      ? thread.items.find((message) => message.id === replyToId)
      : undefined;

    const optimistic: Message = {
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
            preview: replySource.text ?? (replySource.kind === 'image' ? '📷 Photo' : '📎 Fichier'),
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
      attachmentIds: attachments?.map((attachment) => attachment.id),
      replyToId: replyToId ?? null,
      clientId,
    });
  }
});

/**
 * Branche la file d'envoi sur le store. Appelé une fois au démarrage : c'est
 * ce qui fait passer un message de « en cours » à « envoyé » ou « échec ».
 */
export function connectOutboxToStore(): () => void {
  const offSent = outbox.onSent((message, clientId) => {
    useMessagesStore.getState().applyIncoming({ ...message, clientId });
  });

  const offFailed = outbox.onFailed((clientId) => {
    const state = useMessagesStore.getState();
    for (const [conversationId, thread] of Object.entries(state.threads)) {
      const target = thread.items.find((message) => message.clientId === clientId);
      if (!target) continue;
      useMessagesStore.setState({
        threads: {
          ...state.threads,
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

export function selectThread(state: MessagesState, conversationId: ConversationId): ConversationThread {
  return state.threads[conversationId] ?? EMPTY_THREAD;
}
