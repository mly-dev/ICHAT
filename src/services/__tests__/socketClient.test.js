/**
 * Le wrapper WebSocket remplace socket.io-client : file d'émission, dispatch et
 * reconnexion sont désormais de notre ressort, donc testés.
 */
import { __setOnlineForTests } from '@/services/api/network';
import { socketClient } from '@/services/socket/socketClient';
import { SocketStatus } from '@/services/socket/events';

/** Faux WebSocket : on pilote l'ouverture, les messages et la fermeture. */
class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }

  simulateOpen() {
    this.readyState = 1;
    if (this.onopen) this.onopen();
  }

  simulateMessage(event, payload) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify({ event, payload }) });
  }
}

function lastSocket() {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeWebSocket.instances = [];
  global.WebSocket = FakeWebSocket;
  __setOnlineForTests(true);
  socketClient.__reset();
});

afterEach(() => {
  socketClient.__reset();
  jest.useRealTimers();
});

describe('wrapper temps réel', () => {
  it('passe à connecté à l’ouverture', () => {
    socketClient.connect();
    expect(socketClient.getStatus()).toBe(SocketStatus.CONNECTING);

    lastSocket().simulateOpen();
    expect(socketClient.getStatus()).toBe(SocketStatus.CONNECTED);
  });

  it('distribue un événement au bon abonné', () => {
    const received = [];
    socketClient.on('message:new', (payload) => received.push(payload));

    socketClient.connect();
    lastSocket().simulateOpen();
    lastSocket().simulateMessage('message:new', { message: { id: 'm1' } });

    expect(received).toEqual([{ message: { id: 'm1' } }]);
  });

  it('ignore un message illisible sans casser la connexion', () => {
    socketClient.connect();
    lastSocket().simulateOpen();

    expect(() => lastSocket().onmessage({ data: 'pas du json' })).not.toThrow();
    expect(socketClient.getStatus()).toBe(SocketStatus.CONNECTED);
  });

  it("met les émissions en file quand la ligne est coupée, puis les rejoue", () => {
    // Émission avant toute connexion : elle ne doit pas être perdue.
    socketClient.emit('conversation:join', { conversationId: 'c1' });

    socketClient.connect();
    const socket = lastSocket();
    expect(socket.sent).toHaveLength(0);

    socket.simulateOpen();

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({
      event: 'conversation:join',
      payload: { conversationId: 'c1' },
    });
  });

  it('se reconnecte après une fermeture inattendue', () => {
    socketClient.connect();
    lastSocket().simulateOpen();
    expect(FakeWebSocket.instances).toHaveLength(1);

    lastSocket().close();
    expect(socketClient.getStatus()).toBe(SocketStatus.RECONNECTING);

    // Backoff : rien ne repart avant l'échéance.
    jest.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('ne se reconnecte pas après une déconnexion volontaire', () => {
    socketClient.connect();
    lastSocket().simulateOpen();

    socketClient.disconnect();
    jest.advanceTimersByTime(60000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketClient.getStatus()).toBe(SocketStatus.IDLE);
  });

  it('reste hors ligne tant que le réseau est coupé', () => {
    __setOnlineForTests(false);
    socketClient.connect();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(socketClient.getStatus()).toBe(SocketStatus.OFFLINE);
  });

  it('désabonne proprement', () => {
    const received = [];
    const off = socketClient.on('message:new', (payload) => received.push(payload));

    socketClient.connect();
    lastSocket().simulateOpen();
    off();
    lastSocket().simulateMessage('message:new', { message: { id: 'm1' } });

    expect(received).toHaveLength(0);
  });
});
