/** ICH-109 : envoi optimiste, réception et suppression dans un fil. */
import { messagesApi } from '@/services/api';
import { outbox } from '@/services/outbox';
import { useConversationsStore } from '@/store/conversationsStore';
import { selectThread, useMessagesStore } from '@/store/messagesStore';

jest.mock('@/services/api', () => ({
  messagesApi: { list: jest.fn(), remove: jest.fn(), send: jest.fn() },
  toUserMessage: (error) => (error instanceof Error ? error.message : 'erreur'),
}));

const { list, remove, send } = messagesApi;

function serverMessage(id, createdAt, senderId = 'u1') {
  return {
    id,
    conversationId: 'c1',
    senderId,
    kind: 'text',
    text: `texte ${id}`,
    status: 'sent',
    createdAt,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  useMessagesStore.getState().reset();
  useConversationsStore.getState().reset();
  await outbox.__resetForTests();
});

describe('chargement du fil', () => {
  it('charge la première page', async () => {
    list.mockResolvedValueOnce({
      items: [serverMessage('m1', '2026-01-01T08:00:00.000Z')],
      nextCursor: null,
      hasMore: false,
    });

    await useMessagesStore.getState().loadInitial('c1');

    const thread = selectThread(useMessagesStore.getState(), 'c1');
    expect(thread.status).toBe('ready');
    expect(thread.items).toHaveLength(1);
  });

  it('expose une erreur exploitable quand le réseau lâche', async () => {
    list.mockRejectedValueOnce(new Error('Connexion impossible.'));

    await useMessagesStore.getState().loadInitial('c1');

    const thread = selectThread(useMessagesStore.getState(), 'c1');
    expect(thread.status).toBe('error');
    expect(thread.error).toBe('Connexion impossible.');
  });
});

describe('envoi optimiste', () => {
  it('affiche le message immédiatement en « en cours »', async () => {
    // Envoi qui ne répond jamais : c'est exactement le cas d'un réseau lent,
    // et c'est là que l'affichage optimiste doit tenir.
    send.mockImplementation(() => new Promise(() => {}));

    await useMessagesStore.getState().sendText('c1', 'bonjour');

    const thread = selectThread(useMessagesStore.getState(), 'c1');
    expect(thread.items).toHaveLength(1);
    expect(thread.items[0].status).toBe('pending');
    expect(thread.items[0].text).toBe('bonjour');
    expect(outbox.pending()).toHaveLength(1);
  });

  it('ignore un message vide', async () => {
    await useMessagesStore.getState().sendText('c1', '   ');
    expect(selectThread(useMessagesStore.getState(), 'c1').items).toHaveLength(0);
  });

  it('remplace le message optimiste par la version serveur, sans doublon', async () => {
    send.mockImplementation(() => new Promise(() => {}));
    await useMessagesStore.getState().sendText('c1', 'bonjour');
    const { clientId } = selectThread(useMessagesStore.getState(), 'c1').items[0];
    expect(clientId).toBeDefined();

    useMessagesStore.getState().applyIncoming({
      ...serverMessage('srv_1', new Date().toISOString(), 'me'),
      clientId,
      text: 'bonjour',
    });

    const thread = selectThread(useMessagesStore.getState(), 'c1');
    expect(thread.items).toHaveLength(1);
    expect(thread.items[0].id).toBe('srv_1');
    expect(thread.items[0].status).toBe('sent');
  });

  it('repasse un message échoué en « en cours » au réessai', async () => {
    send.mockImplementation(() => new Promise(() => {}));
    await useMessagesStore.getState().sendText('c1', 'bonjour');
    const { clientId } = selectThread(useMessagesStore.getState(), 'c1').items[0];

    useMessagesStore.getState().applyStatus('c1', clientId, 'failed');
    expect(selectThread(useMessagesStore.getState(), 'c1').items[0].status).toBe('failed');

    await useMessagesStore.getState().retryMessage('c1', clientId);
    expect(selectThread(useMessagesStore.getState(), 'c1').items[0].status).toBe('pending');
  });
});

describe('suppression', () => {
  it('supprime localement puis confirme', async () => {
    useMessagesStore.getState().applyIncoming(serverMessage('m1', '2026-01-01T08:00:00.000Z'));
    remove.mockResolvedValueOnce(undefined);

    await useMessagesStore.getState().deleteMessage('c1', 'm1');

    const thread = selectThread(useMessagesStore.getState(), 'c1');
    expect(thread.items[0].deletedAt).toBeTruthy();
    expect(thread.items[0].text).toBeUndefined();
  });

  it('remet le message si le serveur refuse', async () => {
    useMessagesStore.getState().applyIncoming(serverMessage('m1', '2026-01-01T08:00:00.000Z'));
    remove.mockRejectedValueOnce(new Error('Connexion impossible.'));

    await useMessagesStore.getState().deleteMessage('c1', 'm1');

    const thread = selectThread(useMessagesStore.getState(), 'c1');
    expect(thread.items[0].deletedAt).toBeFalsy();
    expect(thread.items[0].text).toBe('texte m1');
  });
});
