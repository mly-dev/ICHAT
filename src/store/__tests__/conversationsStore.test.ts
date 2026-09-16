/** ICH-109 : liste des conversations, tri et compteur de non-lus. */
import { selectTotalUnread, useConversationsStore } from '@/store/conversationsStore';
import type { Conversation, Message } from '@/types/models';

function conversation(id: string, updatedAt: string, unreadCount = 0): Conversation {
  return {
    id,
    type: 'direct',
    title: `Conversation ${id}`,
    unreadCount,
    updatedAt,
    lastMessage: {
      id: `m_${id}`,
      senderId: 'u1',
      preview: 'ancien',
      kind: 'text',
      createdAt: updatedAt,
    },
  };
}

function incoming(conversationId: string, createdAt: string, senderId = 'u1'): Message {
  return {
    id: `new_${conversationId}_${createdAt}`,
    conversationId,
    senderId,
    kind: 'text',
    text: 'nouveau message',
    status: 'delivered',
    createdAt,
  };
}

beforeEach(() => {
  useConversationsStore.getState().reset();
});

describe('liste des conversations', () => {
  it('trie par activité récente à l’insertion', () => {
    const { upsert } = useConversationsStore.getState();
    upsert(conversation('a', '2026-01-01T08:00:00.000Z'));
    upsert(conversation('b', '2026-01-03T08:00:00.000Z'));
    upsert(conversation('c', '2026-01-02T08:00:00.000Z'));

    expect(useConversationsStore.getState().items.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('remonte la conversation qui reçoit un message', () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-01T08:00:00.000Z'));
    store.upsert(conversation('b', '2026-01-02T08:00:00.000Z'));

    store.applyMessage(incoming('a', '2026-01-03T08:00:00.000Z'));

    const items = useConversationsStore.getState().items;
    expect(items[0]?.id).toBe('a');
    expect(items[0]?.lastMessage?.preview).toBe('nouveau message');
  });

  it("n'écrase pas l'aperçu avec un message plus ancien arrivé en retard", () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-03T08:00:00.000Z'));

    store.applyMessage(incoming('a', '2026-01-01T08:00:00.000Z'));

    expect(useConversationsStore.getState().items[0]?.lastMessage?.preview).toBe('ancien');
  });
});

describe('compteur de non-lus', () => {
  it('incrémente sur un message reçu', () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-01T08:00:00.000Z'));

    store.applyMessage(incoming('a', '2026-01-02T08:00:00.000Z'));

    expect(useConversationsStore.getState().items[0]?.unreadCount).toBe(1);
  });

  it("n'incrémente pas pour mes propres messages", () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-01T08:00:00.000Z'));

    store.applyMessage(incoming('a', '2026-01-02T08:00:00.000Z', 'me'), { fromMe: true });

    expect(useConversationsStore.getState().items[0]?.unreadCount).toBe(0);
  });

  it("n'incrémente pas quand la conversation est ouverte à l'écran", () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-01T08:00:00.000Z'));

    store.applyMessage(incoming('a', '2026-01-02T08:00:00.000Z'), { isActive: true });

    expect(useConversationsStore.getState().items[0]?.unreadCount).toBe(0);
  });

  it('remet à zéro au marquage comme lue', () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-01T08:00:00.000Z', 4));

    store.markAsRead('a');

    expect(useConversationsStore.getState().items[0]?.unreadCount).toBe(0);
  });

  it('additionne les non-lus de toutes les conversations pour le badge', () => {
    const store = useConversationsStore.getState();
    store.upsert(conversation('a', '2026-01-01T08:00:00.000Z', 2));
    store.upsert(conversation('b', '2026-01-02T08:00:00.000Z', 3));

    expect(selectTotalUnread(useConversationsStore.getState())).toBe(5);
  });
});
