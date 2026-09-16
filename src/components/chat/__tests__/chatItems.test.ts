import { buildChatItems } from '@/components/chat/chatItems';
import type { Message } from '@/types/models';

function message(id: string, senderId: string, createdAt: string): Message {
  return {
    id,
    conversationId: 'g1',
    senderId,
    senderName: senderId === 'me' ? 'Moi' : `Membre ${senderId}`,
    kind: 'text',
    text: `message ${id}`,
    status: 'sent',
    createdAt,
  };
}

describe('construction des lignes du fil', () => {
  it('renvoie du plus récent au plus ancien (liste inversée)', () => {
    const items = buildChatItems(
      [
        message('a', 'u1', '2026-01-01T08:00:00.000Z'),
        message('b', 'u1', '2026-01-01T09:00:00.000Z'),
      ],
      'me'
    );

    const messageIds = items.filter((item) => item.type === 'message').map((item) => item.key);
    expect(messageIds).toEqual(['b', 'a']);
  });

  it('insère un séparateur par journée', () => {
    const items = buildChatItems(
      [
        message('a', 'u1', '2026-01-01T08:00:00.000Z'),
        message('b', 'u1', '2026-01-02T08:00:00.000Z'),
      ],
      'me'
    );

    expect(items.filter((item) => item.type === 'day')).toHaveLength(2);
  });

  it("affiche l'auteur au premier message d'une personne, puis le masque", () => {
    const items = buildChatItems(
      [
        message('a', 'u1', '2026-01-01T08:00:00.000Z'),
        message('b', 'u1', '2026-01-01T08:01:00.000Z'),
        message('c', 'u2', '2026-01-01T08:02:00.000Z'),
      ],
      'me'
    );

    const byKey = Object.fromEntries(
      items.filter((item) => item.type === 'message').map((item) => [item.key, item])
    );

    expect(byKey.a && byKey.a.type === 'message' && byKey.a.showSender).toBe(true);
    expect(byKey.b && byKey.b.type === 'message' && byKey.b.showSender).toBe(false);
    expect(byKey.c && byKey.c.type === 'message' && byKey.c.showSender).toBe(true);
  });

  it("ne montre jamais l'auteur sur mes propres messages", () => {
    const items = buildChatItems([message('a', 'me', '2026-01-01T08:00:00.000Z')], 'me');
    const own = items.find((item) => item.type === 'message');
    expect(own && own.type === 'message' && own.showSender).toBe(false);
  });

  it('utilise le clientId comme clé tant que le serveur n\'a pas répondu', () => {
    const optimistic: Message = { ...message('loc_1', 'me', '2026-01-01T08:00:00.000Z'), clientId: 'loc_1' };
    const items = buildChatItems([optimistic], 'me');
    expect(items.find((item) => item.type === 'message')?.key).toBe('loc_1');
  });
});
