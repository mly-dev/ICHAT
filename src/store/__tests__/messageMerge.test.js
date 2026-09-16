import { lastMessageDate, mergeMessages, sortMessages, upsertMessage } from '@/store/messageMerge';

function message(overrides) {
  return {
    conversationId: 'c1',
    senderId: 'u1',
    kind: 'text',
    text: 'bonjour',
    status: 'sent',
    ...overrides,
  };
}

describe('ordonnancement des messages', () => {
  it('trie par date croissante', () => {
    const sorted = sortMessages([
      message({ id: 'b', createdAt: '2026-01-02T10:00:00.000Z' }),
      message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' }),
      message({ id: 'c', createdAt: '2026-01-03T10:00:00.000Z' }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('reste stable quand deux messages partagent le même horodatage', () => {
    const same = '2026-01-01T10:00:00.000Z';
    const first = sortMessages([message({ id: 'z', createdAt: same }), message({ id: 'a', createdAt: same })]);
    const second = sortMessages([message({ id: 'a', createdAt: same }), message({ id: 'z', createdAt: same })]);
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
  });

  it('replace un message arrivé en désordre au bon endroit', () => {
    const existing = [
      message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' }),
      message({ id: 'c', createdAt: '2026-01-03T10:00:00.000Z' }),
    ];
    const merged = upsertMessage(existing, message({ id: 'b', createdAt: '2026-01-02T10:00:00.000Z' }));
    expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('déduplication', () => {
  it("n'ajoute pas deux fois le même id", () => {
    const existing = [message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' })];
    const merged = upsertMessage(
      existing,
      message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', text: 'corrigé' })
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('corrigé');
  });

  it('remplace le message optimiste par sa version serveur via clientId', () => {
    const optimistic = message({
      id: 'loc_1',
      clientId: 'loc_1',
      createdAt: '2026-01-01T10:00:00.000Z',
      status: 'pending',
    });
    const fromServer = message({
      id: 'srv_42',
      clientId: 'loc_1',
      createdAt: '2026-01-01T10:00:01.000Z',
      status: 'sent',
    });

    const merged = upsertMessage([optimistic], fromServer);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('srv_42');
    expect(merged[0].status).toBe('sent');
    expect(merged[0].clientId).toBe('loc_1');
  });

  it('supporte la réception du même message par HTTP puis par socket', () => {
    const fromHttp = message({ id: 'srv_1', createdAt: '2026-01-01T10:00:00.000Z' });
    const fromSocket = message({ id: 'srv_1', createdAt: '2026-01-01T10:00:00.000Z' });
    expect(mergeMessages([fromHttp], [fromSocket, fromSocket])).toHaveLength(1);
  });
});

describe('statuts', () => {
  it('ne fait jamais redescendre un statut confirmé', () => {
    const read = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'read' });
    const lateDelivered = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'delivered' });
    expect(upsertMessage([read], lateDelivered)[0].status).toBe('read');
  });

  it('fait avancer un message en attente vers envoyé', () => {
    const pending = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'pending' });
    const sent = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'sent' });
    expect(upsertMessage([pending], sent)[0].status).toBe('sent');
  });

  it("marque un envoi en attente comme échoué", () => {
    const pending = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'pending' });
    const failed = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'failed' });
    expect(upsertMessage([pending], failed)[0].status).toBe('failed');
  });

  it("n'efface pas un statut confirmé avec un échec local tardif", () => {
    const read = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'read' });
    const failed = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'failed' });
    expect(upsertMessage([read], failed)[0].status).toBe('read');
  });

  it('sort un message de l’état échoué quand le réessai aboutit', () => {
    const failed = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'failed' });
    const sent = message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', status: 'sent' });
    expect(upsertMessage([failed], sent)[0].status).toBe('sent');
  });
});

describe('reprise après coupure', () => {
  it('renvoie la date du message le plus récent', () => {
    const items = [
      message({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' }),
      message({ id: 'c', createdAt: '2026-01-03T10:00:00.000Z' }),
      message({ id: 'b', createdAt: '2026-01-02T10:00:00.000Z' }),
    ];
    expect(lastMessageDate(items)).toBe('2026-01-03T10:00:00.000Z');
  });

  it('renvoie null sur un fil vide', () => {
    expect(lastMessageDate([])).toBeNull();
  });
});
