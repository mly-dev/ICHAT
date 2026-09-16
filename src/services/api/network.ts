/**
 * État du réseau. Centralisé ici pour que le client API, le wrapper socket et
 * les écrans partagent une seule source de vérité.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkListener = (online: boolean) => void;

let online = true;
const listeners = new Set<NetworkListener>();

function computeOnline(state: NetInfoState): boolean {
  // `isInternetReachable` peut être null au démarrage : on ne bloque pas dans ce cas.
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  listeners.forEach((listener) => listener(next));
}

let unsubscribeNetInfo: (() => void) | null = null;

export function startNetworkMonitor(): () => void {
  if (unsubscribeNetInfo) return unsubscribeNetInfo;
  unsubscribeNetInfo = NetInfo.addEventListener((state) => setOnline(computeOnline(state)));
  void NetInfo.fetch().then((state) => setOnline(computeOnline(state)));
  return () => {
    unsubscribeNetInfo?.();
    unsubscribeNetInfo = null;
  };
}

export function isOnline(): boolean {
  return online;
}

export function subscribeToNetwork(listener: NetworkListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Attend le retour du réseau — utilisé par la file de réessai. */
export function waitForOnline(): Promise<void> {
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

/** Réservé aux tests. */
export function __setOnlineForTests(value: boolean) {
  setOnline(value);
}
