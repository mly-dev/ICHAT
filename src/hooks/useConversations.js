import { useCallback, useEffect } from 'react';

import { useConversationsStore } from '@/store/conversationsStore';

/**
 * Charge la liste au montage et expose les actions de l'écran d'accueil.
 * Le store garde les données : revenir sur l'onglet ne relance pas d'appel.
 */
export function useConversations() {
  const items = useConversationsStore((state) => state.items);
  const status = useConversationsStore((state) => state.status);
  const error = useConversationsStore((state) => state.error);
  const refreshing = useConversationsStore((state) => state.refreshing);
  const loadingMore = useConversationsStore((state) => state.loadingMore);
  const hasMore = useConversationsStore((state) => state.hasMore);
  const load = useConversationsStore((state) => state.load);
  const refresh = useConversationsStore((state) => state.refresh);
  const loadMore = useConversationsStore((state) => state.loadMore);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => load({ force: true }), [load]);

  return { items, status, error, refreshing, loadingMore, hasMore, refresh, loadMore, retry };
}
