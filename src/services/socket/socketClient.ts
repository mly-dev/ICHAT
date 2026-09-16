/**
 * Wrapper socket.io.
 *
 * Ce que le reste de l'app n'a pas à savoir : la reconnexion avec backoff, la
 * file d'émission quand la ligne est coupée (fréquent au Niger), et le fait que
 * le socket peut ne jamais se connecter en mode mock.
 */
import { io, Socket } from 'socket.io-client';

import { getAuthSnapshot } from '@/mocks';
import { apiConfig } from '@/services/api/config';
import { isOnline, subscribeToNetwork } from '@/services/api/network';
import { logger } from '@/utils/logger';

import type { ClientEventName, ClientEvents, ServerEventName, ServerEvents, SocketStatus } from './events';

type Handler<T> = (payload: T) => void;
type StatusListener = (status: SocketStatus) => void;

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
/** Au-delà, la file n'a plus de sens : l'app resynchronisera par HTTP. */
const MAX_QUEUED_EMITS = 50;

interface QueuedEmit {
  event: ClientEventName;
  payload: unknown;
}

class SocketClient {
  private socket: Socket | null = null;
  private status: SocketStatus = 'idle';
  private statusListeners = new Set<StatusListener>();
  private handlers = new Map<string, Set<Handler<never>>>();
  private queue: QueuedEmit[] = [];
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  /** Date du dernier événement reçu : point de départ de la resynchronisation. */
  private lastEventAt: string | null = null;

  connect(): void {
    if (this.socket?.connected || this.status === 'connecting') return;

    this.networkUnsubscribe ??= subscribeToNetwork((online) => {
      if (online) {
        this.attempts = 0;
        this.connect();
      } else {
        this.setStatus('offline');
      }
    });

    if (!isOnline()) {
      this.setStatus('offline');
      return;
    }

    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');

    const token = getAuthSnapshot().accessToken;
    // On gère nous-mêmes la reconnexion : le backoff de socket.io ne tient pas
    // compte de l'état réseau ni de la file d'émission.
    this.socket = io(apiConfig.socketUrl, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      reconnection: false,
      timeout: 15000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      this.attempts = 0;
      this.setStatus('connected');
      this.flushQueue();
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('socket', 'déconnecté', reason);
      if (reason === 'io client disconnect') return; // déconnexion volontaire
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      logger.warn('socket', 'connexion impossible', error?.message);
      this.scheduleReconnect();
    });

    this.socket.onAny((event: string, payload: unknown) => {
      this.lastEventAt = new Date().toISOString();
      const set = this.handlers.get(event);
      if (!set?.size) return;
      set.forEach((handler) => {
        try {
          (handler as Handler<unknown>)(payload);
        } catch (error) {
          logger.error('socket', `handler ${event}`, error);
        }
      });
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.networkUnsubscribe?.();
    this.networkUnsubscribe = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.attempts = 0;
    this.setStatus('idle');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.socket?.removeAllListeners();
    this.socket?.close();
    this.socket = null;
    this.setStatus(isOnline() ? 'reconnecting' : 'offline');

    // Backoff exponentiel plafonné, avec gigue pour ne pas taper tous en même temps.
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.attempts, MAX_BACKOFF_MS);
    const jitter = Math.round(Math.random() * 400);
    this.attempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + jitter);
  }

  /** Abonnement typé : renvoie la fonction de désabonnement. */
  on<E extends ServerEventName>(event: E, handler: Handler<ServerEvents[E]>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as Handler<never>);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler as Handler<never>);
      if (!set.size) this.handlers.delete(event);
    };
  }

  /** Émission typée ; mise en file si la ligne est coupée. */
  emit<E extends ClientEventName>(event: E, payload: ClientEvents[E]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, payload);
      return;
    }
    if (this.queue.length >= MAX_QUEUED_EMITS) this.queue.shift();
    this.queue.push({ event, payload });
  }

  private flushQueue(): void {
    if (!this.socket?.connected) return;
    const pending = this.queue;
    this.queue = [];
    pending.forEach(({ event, payload }) => this.socket?.emit(event, payload));
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): SocketStatus {
    return this.status;
  }

  getLastEventAt(): string | null {
    return this.lastEventAt;
  }

  private setStatus(next: SocketStatus): void {
    if (next === this.status) return;
    this.status = next;
    this.statusListeners.forEach((listener) => listener(next));
  }

  /** Réservé aux tests. */
  __reset(): void {
    this.disconnect();
    this.handlers.clear();
    this.queue = [];
    this.lastEventAt = null;
  }
}

export const socketClient = new SocketClient();
