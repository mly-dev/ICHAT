/**
 * ICH-109 / ICH-111 : file d'envoi sur réseau instable.
 * Ce sont les cas qui font perdre des messages en vrai : coupure en plein
 * envoi, réseau qui revient, échec répété.
 */
import { messagesApi } from '@/services/api';
import { __setOnlineForTests } from '@/services/api/network';
import { outbox } from '@/services/outbox';
import type { Message } from '@/types/models';

jest.mock('@/services/api', () => ({
  messagesApi: { send: jest.fn() },
}));

const send = messagesApi.send as jest.MockedFunction<typeof messagesApi.send>;

function payload(clientId: string) {
  return { conversationId: 'c1', kind: 'text' as const, text: 'bonjour', clientId };
}

function serverMessage(clientId: string): Message {
  return {
    id: `srv_${clientId}`,
    conversationId: 'c1',
    senderId: 'me',
    kind: 'text',
    text: 'bonjour',
    status: 'sent',
    createdAt: new Date().toISOString(),
    clientId,
  };
}

/** Laisse les promesses en vol se terminer : enqueue déclenche un flush détaché. */
function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

beforeEach(async () => {
  jest.clearAllMocks();
  __setOnlineForTests(true);
  await outbox.__resetForTests();
});

describe("file d'envoi", () => {
  it('envoie et vide la file quand le réseau répond', async () => {
    send.mockResolvedValueOnce(serverMessage('loc_1'));
    const sent: string[] = [];
    const off = outbox.onSent((_message, clientId) => sent.push(clientId));

    await outbox.enqueue(payload('loc_1'));
    await settle();
    await outbox.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(sent).toEqual(['loc_1']);
    expect(outbox.pending()).toHaveLength(0);
    off();
  });

  it("garde le message en file quand le téléphone est hors ligne", async () => {
    __setOnlineForTests(false);

    await outbox.enqueue(payload('loc_2'));
    await outbox.flush();

    expect(send).not.toHaveBeenCalled();
    expect(outbox.pending()).toHaveLength(1);
  });

  it('repart tout seul au retour du réseau', async () => {
    __setOnlineForTests(false);
    await outbox.enqueue(payload('loc_3'));
    await outbox.flush();
    expect(outbox.pending()).toHaveLength(1);

    send.mockResolvedValueOnce(serverMessage('loc_3'));
    __setOnlineForTests(true);
    await outbox.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(outbox.pending()).toHaveLength(0);
  });

  it('réessaie après une coupure en plein envoi, sans dupliquer le message', async () => {
    send.mockRejectedValueOnce(new Error('connexion perdue'));
    await outbox.enqueue(payload('loc_4'));
    await outbox.flush();

    expect(outbox.pending()).toHaveLength(1);
    expect(outbox.pending()[0]?.attempts).toBe(1);

    // Le backoff bloque un rejeu immédiat : on force l'échéance.
    send.mockResolvedValueOnce(serverMessage('loc_4'));
    await outbox.retryNow('loc_4');
    await outbox.flush();

    expect(send).toHaveBeenCalledTimes(2);
    expect(outbox.pending()).toHaveLength(0);
  });

  it('abandonne et signale après cinq tentatives', async () => {
    const failures: string[] = [];
    const off = outbox.onFailed((clientId) => failures.push(clientId));
    send.mockRejectedValue(new Error('réseau'));

    // Le backoff repousse chaque essai ; on avance l'horloge plutôt que
    // d'attendre réellement, et sans retryNow qui remettrait le compteur à zéro.
    const realNow = Date.now();
    let clock = realNow;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);

    await outbox.enqueue(payload('loc_5'));
    await settle();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      clock += 5 * 60 * 1000;
      await outbox.flush();
      await settle();
    }

    expect(outbox.pending()).toHaveLength(0);
    expect(failures).toContain('loc_5');
    nowSpy.mockRestore();
    off();
  });

  it("n'empile pas deux fois le même message", async () => {
    __setOnlineForTests(false);
    await outbox.enqueue(payload('loc_6'));
    await outbox.enqueue(payload('loc_6'));

    expect(outbox.pending()).toHaveLength(1);
  });

  it("respecte l'ordre d'écriture", async () => {
    const order: string[] = [];
    send.mockImplementation(async (input) => {
      order.push(input.clientId);
      return serverMessage(input.clientId);
    });

    await outbox.enqueue(payload('loc_a'));
    await settle();
    await outbox.enqueue(payload('loc_b'));
    await settle();
    await outbox.flush();
    await settle();

    expect(order).toEqual(['loc_a', 'loc_b']);
  });
});
