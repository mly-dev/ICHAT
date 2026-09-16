/**
 * File d'envoi persistante.
 *
 * Sans elle, un message écrit dans un couloir sans réseau est perdu au moment
 * où l'app est fermée. La file est stockée sur le téléphone, rejouée au retour
 * du réseau et au démarrage, et abandonne après plusieurs échecs plutôt que de
 * boucler indéfiniment.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { messagesApi, type SendMessagePayload } from '@/services/api';
import { isOnline, subscribeToNetwork } from '@/services/api/network';
import type { Message } from '@/types/models';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'ilimichat.outbox.v1';
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

export interface OutboxEntry {
  payload: SendMessagePayload;
  attempts: number;
  /** Date du prochain essai autorisé (backoff). */
  nextAttemptAt: number;
}

type SentListener = (message: Message, clientId: string) => void;
type FailedListener = (clientId: string, reason: string) => void;

let entries: OutboxEntry[] = [];
let loaded = false;
let flushing = false;
let networkUnsubscribe: (() => void) | null = null;
const sentListeners = new Set<SentListener>();
const failedListeners = new Set<FailedListener>();

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.warn('outbox', 'persist', error);
  }
}

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    entries = raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch (error) {
    logger.warn('outbox', 'load', error);
    entries = [];
  }
}

export const outbox = {
  /** À appeler une fois au démarrage : reprend ce qui n'est jamais parti. */
  async start(): Promise<void> {
    await load();
    networkUnsubscribe ??= subscribeToNetwork((online) => {
      if (online) void outbox.flush();
    });
    void outbox.flush();
  },

  stop(): void {
    networkUnsubscribe?.();
    networkUnsubscribe = null;
  },

  async enqueue(payload: SendMessagePayload): Promise<void> {
    await load();
    if (entries.some((entry) => entry.payload.clientId === payload.clientId)) return;
    entries = [...entries, { payload, attempts: 0, nextAttemptAt: 0 }];
    await persist();
    void outbox.flush();
  },

  async remove(clientId: string): Promise<void> {
    await load();
    entries = entries.filter((entry) => entry.payload.clientId !== clientId);
    await persist();
  },

  /** Remet une entrée en tête de file, sur demande explicite de l'utilisateur. */
  async retryNow(clientId: string): Promise<void> {
    await load();
    entries = entries.map((entry) =>
      entry.payload.clientId === clientId ? { ...entry, attempts: 0, nextAttemptAt: 0 } : entry
    );
    await persist();
    void outbox.flush();
  },

  async flush(): Promise<void> {
    if (flushing) return;
    await load();
    if (!entries.length || !isOnline()) return;

    flushing = true;
    try {
      // File FIFO : l'ordre d'écriture est l'ordre d'envoi, sinon les réponses
      // arrivent avant les questions.
      for (const entry of [...entries]) {
        if (!isOnline()) break;
        if (Date.now() < entry.nextAttemptAt) continue;

        try {
          const message = await messagesApi.send(entry.payload);
          entries = entries.filter((item) => item.payload.clientId !== entry.payload.clientId);
          await persist();
          sentListeners.forEach((listener) => listener(message, entry.payload.clientId));
        } catch (error) {
          const attempts = entry.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            entries = entries.filter((item) => item.payload.clientId !== entry.payload.clientId);
            await persist();
            failedListeners.forEach((listener) =>
              listener(entry.payload.clientId, "Le message n'a pas pu être envoyé.")
            );
          } else {
            const delay = BASE_DELAY_MS * 2 ** (attempts - 1);
            entries = entries.map((item) =>
              item.payload.clientId === entry.payload.clientId
                ? { ...item, attempts, nextAttemptAt: Date.now() + delay }
                : item
            );
            await persist();
            failedListeners.forEach((listener) =>
              listener(entry.payload.clientId, 'Envoi en attente du réseau.')
            );
          }
          // Une erreur suffit à arrêter la passe : inutile d'épuiser la file
          // (et la batterie) quand la ligne est mauvaise.
          break;
        }
      }
    } finally {
      flushing = false;
    }
  },

  onSent(listener: SentListener): () => void {
    sentListeners.add(listener);
    return () => sentListeners.delete(listener);
  },

  onFailed(listener: FailedListener): () => void {
    failedListeners.add(listener);
    return () => failedListeners.delete(listener);
  },

  /** Entrées en attente, pour l'affichage et les tests. */
  pending(): OutboxEntry[] {
    return entries;
  },

  async __resetForTests(): Promise<void> {
    entries = [];
    loaded = true;
    flushing = false;
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
