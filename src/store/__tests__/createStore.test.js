/**
 * Le store maison remplace Zustand : il mérite ses propres tests, sinon une
 * régression ici casse silencieusement tous les écrans.
 */
import { createStore } from '@/store/createStore';

function counterStore() {
  return createStore((set, get) => ({
    count: 0,
    label: 'compteur',
    increment: () => set({ count: get().count + 1 }),
    addWithUpdater: () => set((state) => ({ count: state.count + 10 })),
    reset: () => set({ count: 0 }),
  }));
}

describe('store maison', () => {
  it('expose l’état initial', () => {
    const useStore = counterStore();
    expect(useStore.getState().count).toBe(0);
  });

  it('met à jour via set et via une fonction', () => {
    const useStore = counterStore();
    useStore.getState().increment();
    expect(useStore.getState().count).toBe(1);

    useStore.getState().addWithUpdater();
    expect(useStore.getState().count).toBe(11);
  });

  it('prévient les abonnés à chaque changement', () => {
    const useStore = counterStore();
    const seen = [];
    const unsubscribe = useStore.subscribe((state) => seen.push(state.count));

    useStore.getState().increment();
    useStore.getState().increment();
    unsubscribe();
    useStore.getState().increment();

    expect(seen).toEqual([1, 2]);
  });

  it('remplace l’objet d’état mais garde les références non modifiées', () => {
    const useStore = createStore((set) => ({
      items: [1, 2, 3],
      flag: false,
      raise: () => set({ flag: true }),
    }));

    const before = useStore.getState().items;
    useStore.getState().raise();

    // Indispensable : les sélecteurs comparent par identité, un tableau recréé
    // à chaque changement ferait re-rendre toutes les listes pour rien.
    expect(useStore.getState().items).toBe(before);
  });

  it('ignore une mise à jour vide', () => {
    const useStore = counterStore();
    const seen = [];
    useStore.subscribe(() => seen.push(1));

    useStore.setState(null);
    useStore.setState(undefined);

    expect(seen).toHaveLength(0);
  });
});
