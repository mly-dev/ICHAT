import { useCallback, useEffect, useMemo } from 'react';

import { buildChatItems } from '@/components/chat/chatItems';
import { getCurrentUserId } from '@/mocks';
import { selectThread, useMessagesStore } from '@/store/messagesStore';

/**
 * Référence stable : `[]` recréé à chaque rendu ferait re-calculer la liste du
 * fil en boucle, et re-rendre tous les messages avec.
 */
const NO_MESSAGES = [];

/**
 * Fil d'une conversation : chargement initial, pagination, et transformation en
 * lignes prêtes pour la liste inversée.
 */
export function useMessages(conversationId) {
  const thread = useMessagesStore((state) =>
    conversationId ? selectThread(state, conversationId) : null
  );
  const loadInitial = useMessagesStore((state) => state.loadInitial);
  const loadOlder = useMessagesStore((state) => state.loadOlder);
  const setActiveConversation = useMessagesStore((state) => state.setActiveConversation);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    if (!conversationId) return undefined;
    setActiveConversation(conversationId);
    void loadInitial(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, loadInitial, setActiveConversation]);

  const messages = thread ? thread.items : NO_MESSAGES;
  const items = useMemo(() => buildChatItems(messages, currentUserId), [messages, currentUserId]);

  const onEndReached = useCallback(() => {
    if (conversationId && thread && thread.hasMore && !thread.loadingOlder) {
      void loadOlder(conversationId);
    }
  }, [conversationId, loadOlder, thread]);

  const retry = useCallback(() => {
    if (conversationId) void loadInitial(conversationId, { force: true });
  }, [conversationId, loadInitial]);

  return {
    items,
    messages,
    status: thread ? thread.status : 'idle',
    error: thread ? thread.error : null,
    loadingOlder: thread ? thread.loadingOlder : false,
    hasMore: thread ? thread.hasMore : false,
    onEndReached,
    retry,
  };
}
