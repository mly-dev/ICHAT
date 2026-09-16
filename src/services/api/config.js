/**
 * Configuration réseau.
 *
 * React Native nu n'a pas de mécanisme de variables d'environnement : sans
 * dépendance supplémentaire, la configuration vit dans ce fichier. C'est le
 * seul endroit à changer pour pointer vers le back d'Ibou.
 */
export const apiConfig = {
  baseUrl: 'https://api.ilimichat.adu.ne',
  socketUrl: 'wss://api.ilimichat.adu.ne/ws',
  timeout: 20000,
  /** Tant que le back n'est pas déployé, on sert des données simulées. */
  useMocks: true,
};

/** Permet de surcharger la configuration au démarrage (build de recette, tests). */
export function configureApi(overrides) {
  Object.assign(apiConfig, overrides);
}
