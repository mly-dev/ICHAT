/**
 * Petit store maison, ~40 lignes, zéro dépendance.
 *
 * On avait d'abord pris Zustand ; le socle retenu est « React Native template
 * blanc, rien de plus que react-navigation ». L'API est volontairement la même
 * (un initialiseur qui reçoit set/get, un hook avec sélecteur) pour que les
 * modules restent lisibles et qu'un passage à Zustand ou Redux plus tard ne
 * demande qu'un changement ici.
 *
 * S'appuie sur useSyncExternalStore : c'est le mécanisme prévu par React pour
 * s'abonner à un état extérieur sans re-rendu inutile.
 */
import { useSyncExternalStore } from 'react';

const identity = (state) => state;

export function createStore(initializer) {
  let state;
  const listeners = new Set();

  function setState(partial) {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    if (!patch || patch === state) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  state = initializer(setState, getState);

  /**
   * Le sélecteur doit renvoyer une valeur stable tant que l'état ne change pas
   * (une primitive ou une référence déjà présente dans l'état) : React compare
   * par identité, et un objet recréé à chaque appel provoquerait une boucle.
   */
  function useStore(selector = identity) {
    const getSnapshot = () => selector(state);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}
