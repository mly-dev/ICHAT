import { useCallback, useEffect, useMemo } from 'react';

import { buildChatItems } from '@/components/chat/chatItems';
import { getCurrentUserId } from '@/mocks';
import { selectThread, useMessagesStore } from '@/store/messagesStore';
import type { ConversationId } from '@/types/models';

/**
 * Fil d'une conversation : chargement initial, pagination, et transformation en
 * lignes prêtes pour la liste inversée.
 */
export function useMessages(conversationId: ConversationId | null) {
  const thread = useMessagesStore((state) =>
    conversationId ? selectThread(state, conversationId) : undefined
  );
  const loadInitial = useMessagesStore((state) => state.loadInitial);
  const loadOlder = useMessagesStore((state) => state.loadOlder);
  const setActiveConversation = useMessagesStore((state) => state.setActiveConversation);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    if (!conversationId) return;
    setActiveConversation(conversationId);
    void loadInitial(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, loadInitial, setActiveConversation]);

  const items = useMemo(
    () => buildChatItems(thread?.items ?? [], currentUserId),
    [thread?.items, currentUserId]
  );

  const onEndReached = useCallback(() => {
    if (conversationId && thread?.hasMore && !thread.loadingOlder) void loadOlder(conversationId);
  }, [conversationId, loadOlder, thread?.hasMore, thread?.loadingOlder]);

  const retry = useCallback(() => {
    if (conversationId) void loadInitial(conversationId, { force: true });
  }, [conversationId, loadInitial]);

  return {
    items,
    messages: thread?.items ?? [],
    status: thread?.status ?? 'idle',
    error: thread?.error ?? null,
    loadingOlder: thread?.loadingOlder ?? false,
    hasMore: thread?.hasMore ?? false,
    onEndReached,
    retry,
  };
}
