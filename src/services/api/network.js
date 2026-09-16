/**
 * État du réseau, sans dépendance.
 *
 * `@react-native-community/netinfo` donnerait l'état de la puce radio, mais
 * c'est une dépendance de plus — et au Niger, « connecté au Wi-Fi » ne veut pas
 * dire « joignable ». On déduit donc l'état du réseau du résultat réel des
 * requêtes : un échec de transport fait passer hors ligne, et une sonde
 * périodique légère détecte le retour.
 */
import { apiConfig } from './config';
import { logger } from '@/utils/logger';

const PROBE_BASE_DELAY_MS = 3000;
const PROBE_MAX_DELAY_MS = 30000;
const PROBE_TIMEOUT_MS = 5000;

let online = true;
let probeTimer = null;
let probeAttempts = 0;
const listeners = new Set();

function setOnline(next) {
  if (next === online) return;
  online = next;
  listeners.forEach((listener) => listener(next));
}

export function isOnline() {
  return online;
}

export function subscribeToNetwork(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Une requête a abouti : la ligne est bonne, on arrête de sonder. */
export function reportNetworkSuccess() {
  probeAttempts = 0;
  if (probeTimer) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  setOnline(true);
}

/** Échec de transport (pas une erreur métier) : on bascule hors ligne et on sonde. */
export function reportNetworkFailure() {
  setOnline(false);
  scheduleProbe();
}

function scheduleProbe() {
  if (probeTimer) return;
  const delay = Math.min(PROBE_BASE_DELAY_MS * 2 ** probeAttempts, PROBE_MAX_DELAY_MS);
  probeAttempts += 1;

  probeTimer = setTimeout(async () => {
    probeTimer = null;
    const reachable = await probe();
    if (reachable) reportNetworkSuccess();
    else scheduleProbe();
  }, delay);
}

/** Sonde volontairement minuscule : une requête HEAD, pas de corps à charger. */
async function probe() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(apiConfig.baseUrl, { method: 'HEAD', signal: controller.signal });
    return true;
  } catch (error) {
    logger.debug('network', 'sonde échouée');
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Attend le retour du réseau — utilisé par la file de réessai. */
export function waitForOnline() {
  if (online) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = subscribeToNetwork((next) => {
      if (next) {
        unsubscribe();
        resolve();
      }
    });
  });
}

export function stopNetworkMonitor() {
  if (probeTimer) clearTimeout(probeTimer);
  probeTimer = null;
  probeAttempts = 0;
}

export function __setOnlineForTests(value) {
  setOnline(value);
}
