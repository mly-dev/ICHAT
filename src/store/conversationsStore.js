/**
 * Store des conversations (ICH-013 à ICH-018).
 *
 * C'est aussi **la** source de vérité du nombre de non-lus : le badge de
 * l'onglet, celui de l'icône de l'app et les écrans d'Adam lisent tous ici. On
 * ne recalcule pas ce compteur ailleurs.
 */
import { conversationsApi, toUserMessage } from '@/services/api';
import { logger } from '@/utils/logger';

import { createStore } from './createStore';

function sortByActivity(items) {
  return [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function previewOf(message) {
  if (message.deletedAt) return 'Message supprimé';
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'file') {
    const first = message.attachments && message.attachments[0];
    return `📎 ${(first && first.name) || 'Fichier'}`;
  }
  return message.text || '';
}

export const useConversationsStore = createStore((set, get) => ({
  items: [],
  status: 'idle',
  error: null,
  refreshing: false,
  loadingMore: false,
  nextCursor: null,
  hasMore: false,

  async load({ force = false } = {}) {
    const { status, items } = get();
    // Sur un réseau facturé, on ne recharge pas une liste déjà en mémoire.
    if (!force && (status === 'loading' || (status === 'ready' && items.length))) return;

    set({ status: items.length ? 'ready' : 'loading', error: null });
    try {
      const page = await conversationsApi.list({});
      set({
        items: sortByActivity(page.items),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        status: 'ready',
        error: null,
      });
    } catch (error) {
      logger.warn('conversations', 'load', error);
      set({ status: 'error', error: toUserMessage(error) });
    }
  },

  async refresh() {
    if (get().refreshing) return;
    set({ refreshing: true });
    try {
      const page = await conversationsApi.list({});
      set({
        items: sortByActivity(page.items),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        status: 'ready',
        error: null,
      });
    } catch (error) {
      logger.warn('conversations', 'refresh', error);
      // On garde la liste affichée : un échec de rafraîchissement ne doit pas
      // vider l'écran de quelqu'un qui vient de perdre le réseau.
      set({ error: toUserMessage(error) });
    } finally {
      set({ refreshing: false });
    }
  },

  async loadMore() {
    const { hasMore, loadingMore, nextCursor, items } = get();
    if (!hasMore || loadingMore || !nextCursor) return;

    set({ loadingMore: true });
    try {
      const page = await conversationsApi.list({ cursor: nextCursor });
      const known = new Set(items.map((item) => item.id));
      const merged = [...items, ...page.items.filter((item) => !known.has(item.id))];
      set({ items: sortByActivity(merged), nextCursor: page.nextCursor, hasMore: page.hasMore });
    } catch (error) {
      logger.warn('conversations', 'loadMore', error);
      set({ error: toUserMessage(error) });
    } finally {
      set({ loadingMore: false });
    }
  },

  upsert(conversation) {
    const { items } = get();
    const index = items.findIndex((item) => item.id === conversation.id);
    const next =
      index >= 0
        ? items.map((item, i) => (i === index ? { ...item, ...conversation } : item))
        : [conversation, ...items];
    set({ items: sortByActivity(next), status: 'ready' });
  },

  /** Répercute un message entrant ou sortant sur l'aperçu et les non-lus. */
  applyMessage(message, { fromMe = false, isActive = false } = {}) {
    const { items } = get();
    const index = items.findIndex((item) => item.id === message.conversationId);
    if (index < 0) return; // conversation inconnue : le prochain refresh la ramènera

    const current = items[index];

    // Un message plus ancien que le dernier connu ne doit pas réécrire l'aperçu
    // (l'ordre d'arrivée n'est pas garanti après une coupure).
    const isNewer =
      !current.lastMessage ||
      Date.parse(message.createdAt) >= Date.parse(current.lastMessage.createdAt);

    const updated = {
      ...current,
      updatedAt: isNewer ? message.createdAt : current.updatedAt,
      lastMessage: isNewer
        ? {
            id: message.id,
            senderId: message.senderId,
            senderName: message.senderName,
            preview: previewOf(message),
            kind: message.kind,
            createdAt: message.createdAt,
          }
        : current.lastMessage,
      unreadCount: fromMe || isActive ? current.unreadCount : current.unreadCount + 1,
    };

    set({ items: sortByActivity(items.map((item, i) => (i === index ? updated : item))) });
  },

  setUnreadCount(conversationId, unreadCount) {
    set({
      items: get().items.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: Math.max(0, unreadCount) } : item
      ),
    });
  },

  markAsRead(conversationId) {
    const target = get().items.find((item) => item.id === conversationId);
    if (!target || target.unreadCount === 0) return;
    set({
      items: get().items.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item
      ),
    });
  },

  remove(conversationId) {
    set({ items: get().items.filter((item) => item.id !== conversationId) });
  },

  reset() {
    set({
      items: [],
      status: 'idle',
      error: null,
      refreshing: false,
      loadingMore: false,
      nextCursor: null,
      hasMore: false,
    });
  },
}));

/** Sélecteur : total des non-lus, pour les badges (ICH-015, ICH-054). */
export function selectTotalUnread(state) {
  return state.items.reduce((total, item) => total + item.unreadCount, 0);
}

export function selectConversationById(state, id) {
  return state.items.find((item) => item.id === id);
}

export function getTotalUnread() {
  return selectTotalUnread(useConversationsStore.getState());
}
