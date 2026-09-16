/**
 * MOCK — le module d'authentification appartient à Adam (ICH-001 à ICH-007).
 *
 * Tant que le sien n'existe pas, mes modules consomment `useAuth()` depuis ce
 * fichier. Le jour où Adam livre, il suffit de changer le ré-export dans
 * `src/mocks/index.js` : aucun de mes écrans n'importe ce fichier directement.
 */
import { createStore } from '@/store/createStore';

const MOCK_USER = {
  id: 'me',
  fullName: 'Momo (mock)',
  email: 'momo@adu.ne',
  department: 'Informatique',
  avatarUrl: null,
};

export const useAuthStore = createStore((set, get) => ({
  user: MOCK_USER,
  accessToken: 'mock-access-token',
  isAuthenticated: true,
  getAccessToken: async () => get().accessToken,
  refreshAccessToken: async () => get().accessToken,
  __setMockSession: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
}));

/** Hook consommé par mes écrans — signature à garder stable côté Adam. */
export function useAuth() {
  return useAuthStore();
}

/** Accès hors composant (client API, socket), sans abonnement React. */
export function getAuthSnapshot() {
  return useAuthStore.getState();
}

export function getCurrentUserId() {
  const { user } = useAuthStore.getState();
  return user ? user.id : null;
}
