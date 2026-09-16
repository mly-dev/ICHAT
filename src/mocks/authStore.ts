/**
 * MOCK — le store d'authentification appartient à Adam (ICH-001 à ICH-007).
 *
 * Tant que son store n'existe pas, mes modules consomment `useAuth()` depuis ce
 * fichier. Le jour où Adam livre le sien, il suffit de changer le ré-export dans
 * `src/mocks/index.ts` : aucun de mes écrans n'importe ce fichier directement.
 */
import { create } from 'zustand';

import type { UserSummary } from '@/types/models';

export interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** Renvoie un token frais ; c'est le point d'extension côté Adam. */
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string | null>;
  /** Uniquement pour le développement local, jamais appelé par mes écrans. */
  __setMockSession: (user: UserSummary, token: string) => void;
}

const MOCK_USER: UserSummary = {
  id: 'me',
  fullName: 'Momo (mock)',
  email: 'momo@adu.ne',
  department: 'Informatique',
  avatarUrl: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: MOCK_USER,
  accessToken: 'mock-access-token',
  isAuthenticated: true,
  getAccessToken: async () => get().accessToken,
  refreshAccessToken: async () => get().accessToken,
  __setMockSession: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
}));

/** Hook consommé par mes écrans — signature à garder stable côté Adam. */
export function useAuth(): AuthState {
  return useAuthStore();
}

/** Accès hors composant (client API, socket), sans abonnement React. */
export function getAuthSnapshot(): AuthState {
  return useAuthStore.getState();
}

export function getCurrentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}
