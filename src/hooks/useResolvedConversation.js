import { useEffect, useState } from 'react';

import { conversationsApi, toUserMessage } from '@/services/api';
import { useConversationsStore } from '@/store/conversationsStore';

/**
 * Résout la conversation à afficher (ICH-019).
 * openConversation(userId) navigue immédiatement, sans attendre le réseau :
 * c'est ici qu'on récupère ou crée la conversation correspondante.
 */
export function useResolvedConversation({ conversationId, peerId }) {
  const known = useConversationsStore((state) =>
    conversationId ? state.items.find((item) => item.id === conversationId) : undefined
  );
  const upsert = useConversationsStore((state) => state.upsert);

  const [resolved, setResolved] = useState(known || null);
  const [resolving, setResolving] = useState(!conversationId && !!peerId);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (conversationId) {
        if (known) {
          setResolved(known);
          return;
        }
        try {
          const conversation = await conversationsApi.getById(conversationId);
          if (cancelled) return;
          upsert(conversation);
          setResolved(conversation);
        } catch (resolveError) {
          if (!cancelled) setError(toUserMessage(resolveError));
        }
        return;
      }

      if (!peerId) return;
      setResolving(true);
      try {
        const conversation = await conversationsApi.openDirect(peerId);
        if (cancelled) return;
        upsert(conversation);
        setResolved(conversation);
        setError(null);
      } catch (resolveError) {
        if (!cancelled) setError(toUserMessage(resolveError));
      } finally {
        if (!cancelled) setResolving(false);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [conversationId, known, peerId, upsert]);

  return { conversation: known || resolved, resolving, error };
}
