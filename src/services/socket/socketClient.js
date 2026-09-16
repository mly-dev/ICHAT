/**
 * Wrapper temps réel, bâti sur le WebSocket natif de React Native.
 *
 * On avait d'abord pris socket.io-client ; le socle retenu n'autorise aucune
 * dépendance en dehors de react-navigation, et WebSocket est fourni par la
 * plateforme. Ce qu'on perd (rooms, reconnexion, acquittements), on le
 * réimplémente ici, en mieux adapté au terrain : le backoff tient compte de
 * l'état réseau réel, et les émissions faites hors connexion sont mises en file
 * plutôt que perdues.
 *
 * Le reste de l'app ne voit que `on`, `emit`, `onStatusChange` : si Ibou impose
 * finalement socket.io, seul ce fichier change.
 */
import { getAuthSnapshot } from '@/mocks';
import { apiConfig } from '@/services/api/config';
import { isOnline, subscribeToNetwork } from '@/services/api/network';
import { logger } from '@/utils/logger';

import { SocketStatus } from './events';

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
/** Au-delà, la file n'a plus de sens : l'app resynchronisera par HTTP. */
const MAX_QUEUED_EMITS = 50;
/** Ping applicatif : sans lui, une coupure passe inaperçue pendant des minutes. */
const HEARTBEAT_MS = 25000;

class SocketClient {
  constructor() {
    this.socket = null;
    this.status = SocketStatus.IDLE;
    this.statusListeners = new Set();
    this.handlers = new Map();
    this.queue = [];
    this.attempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.networkUnsubscribe = null;
    this.lastEventAt = null;
    this.manuallyClosed = false;
  }

  connect() {
    if (this.socket || this.status === SocketStatus.CONNECTING) return;
    this.manuallyClosed = false;

    if (!this.networkUnsubscribe) {
      this.networkUnsubscribe = subscribeToNetwork((online) => {
        if (online) {
          this.attempts = 0;
          this.connect();
        } else {
          this.setStatus(SocketStatus.OFFLINE);
        }
      });
    }

    if (!isOnline()) {
      this.setStatus(SocketStatus.OFFLINE);
      return;
    }

    this.setStatus(this.attempts === 0 ? SocketStatus.CONNECTING : SocketStatus.RECONNECTING);

    // Le WebSocket natif n'accepte pas d'en-têtes de façon fiable sur les deux
    // plateformes : le token passe donc en paramètre d'URL. À confirmer avec Ibou.
    const token = getAuthSnapshot().accessToken;
    const url = token
      ? `${apiConfig.socketUrl}?token=${encodeURIComponent(token)}`
      : apiConfig.socketUrl;

    try {
      this.socket = new WebSocket(url);
    } catch (error) {
      logger.warn('socket', 'création impossible', error);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.attempts = 0;
      this.setStatus(SocketStatus.CONNECTED);
      this.flushQueue();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      this.lastEventAt = new Date().toISOString();
      let envelope;
      try {
        envelope = JSON.parse(event.data);
      } catch (error) {
        logger.warn('socket', 'message illisible', event.data);
        return;
      }
      if (!envelope || !envelope.event) return;
      this.dispatch(envelope.event, envelope.payload);
    };

    this.socket.onerror = (error) => {
      logger.warn('socket', 'erreur', error && error.message);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;
      if (this.manuallyClosed) return;
      this.scheduleReconnect();
    };
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopHeartbeat();
    if (this.networkUnsubscribe) this.networkUnsubscribe();
    this.networkUnsubscribe = null;
    if (this.socket) this.socket.close();
    this.socket = null;
    this.attempts = 0;
    this.setStatus(SocketStatus.IDLE);
  }

  dispatch(event, payload) {
    const set = this.handlers.get(event);
    if (!set || !set.size) return;
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error('socket', `handler ${event}`, error);
      }
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.setStatus(isOnline() ? SocketStatus.RECONNECTING : SocketStatus.OFFLINE);

    // Backoff exponentiel plafonné, avec gigue : sinon tous les téléphones
    // retapent le serveur à la même seconde après une coupure générale.
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.attempts, MAX_BACKOFF_MS);
    const jitter = Math.round(Math.random() * 400);
    this.attempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + jitter);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === 1) {
        this.socket.send(JSON.stringify({ event: 'ping' }));
      }
    }, HEARTBEAT_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  /** Abonnement : renvoie la fonction de désabonnement. */
  on(event, handler) {
    const set = this.handlers.get(event) || new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler);
      if (!set.size) this.handlers.delete(event);
    };
  }

  /** Émission ; mise en file si la ligne est coupée. */
  emit(event, payload) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify({ event, payload }));
      return;
    }
    if (this.queue.length >= MAX_QUEUED_EMITS) this.queue.shift();
    this.queue.push({ event, payload });
  }

  flushQueue() {
    if (!this.socket || this.socket.readyState !== 1) return;
    const pending = this.queue;
    this.queue = [];
    pending.forEach(({ event, payload }) => {
      this.socket.send(JSON.stringify({ event, payload }));
    });
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  getStatus() {
    return this.status;
  }

  getLastEventAt() {
    return this.lastEventAt;
  }

  setStatus(next) {
    if (next === this.status) return;
    this.status = next;
    this.statusListeners.forEach((listener) => listener(next));
  }

  __reset() {
    this.disconnect();
    this.handlers.clear();
    this.queue = [];
    this.lastEventAt = null;
    this.manuallyClosed = false;
  }
}

export const socketClient = new SocketClient();
