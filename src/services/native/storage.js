/**
 * Stockage clé/valeur persistant.
 *
 * ⚠️ React Native nu n'offre aucun stockage persistant : cela demande une
 * dépendance (`@react-native-async-storage/async-storage`), que je n'ajoute pas
 * sans ton accord — voir docs/DEPENDANCES-A-VALIDER.md.
 *
 * En attendant, l'implémentation par défaut garde tout en mémoire : l'app
 * fonctionne, mais la file d'envoi et les préférences repartent à zéro au
 * redémarrage. Le jour où tu valides la dépendance, il n'y a que
 * `setStorageAdapter` à appeler au démarrage, rien d'autre à toucher.
 */
const memory = new Map();

const memoryAdapter = {
  async getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  async setItem(key, value) {
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
};

let adapter = memoryAdapter;

/** Branche un vrai stockage persistant (AsyncStorage, MMKV, …). */
export function setStorageAdapter(next) {
  adapter = next || memoryAdapter;
}

export const storage = {
  getItem: (key) => adapter.getItem(key),
  setItem: (key, value) => adapter.setItem(key, value),
  removeItem: (key) => adapter.removeItem(key),
  /** Vrai seulement si un adaptateur persistant a été branché. */
  isPersistent: () => adapter !== memoryAdapter,
};

export function __resetStorageForTests() {
  memory.clear();
  adapter = memoryAdapter;
}
