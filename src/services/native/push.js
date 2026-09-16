/**
 * Notifications push — couche native.
 *
 * ⚠️ React Native nu ne sait pas recevoir de push : cela demande
 * `@react-native-firebase/messaging` (Android/iOS) et, pour l'affichage en
 * premier plan, `notifee` ou équivalent, plus la configuration native.
 * Dépendances non ajoutées sans ton accord — voir docs/DEPENDANCES-A-VALIDER.md.
 *
 * Ce module définit le contrat attendu. Sans adaptateur branché, tout est
 * silencieux : l'app fonctionne, elle ne reçoit simplement pas de push. Le reste
 * du code (enregistrement du token, routage, badge) est écrit et testé, il n'y a
 * que ce fichier à brancher.
 */
const noop = () => {};

const defaultAdapter = {
  /** → 'granted' | 'denied' */
  requestPermission: async () => 'denied',
  /** → jeton de l'appareil, ou null */
  getToken: async () => null,
  /** (listener) → désabonnement */
  onTokenRefresh: () => noop,
  /** Message reçu app au premier plan. (listener) → désabonnement */
  onMessage: () => noop,
  /** Tap sur une notification, app en arrière-plan. (listener) → désabonnement */
  onNotificationOpened: () => noop,
  /** Notification ayant lancé l'app alors qu'elle était fermée. */
  getInitialNotification: async () => null,
  /** Badge de l'icône de l'app. */
  setBadgeCount: async () => {},
  /** Affiche une notification locale (app au premier plan). */
  displayLocalNotification: async () => {},
};

let adapter = defaultAdapter;

export function setPushAdapter(next) {
  adapter = { ...defaultAdapter, ...next };
}

export function isPushAvailable() {
  return adapter !== defaultAdapter;
}

export const push = {
  requestPermission: (...args) => adapter.requestPermission(...args),
  getToken: (...args) => adapter.getToken(...args),
  onTokenRefresh: (...args) => adapter.onTokenRefresh(...args),
  onMessage: (...args) => adapter.onMessage(...args),
  onNotificationOpened: (...args) => adapter.onNotificationOpened(...args),
  getInitialNotification: (...args) => adapter.getInitialNotification(...args),
  setBadgeCount: (...args) => adapter.setBadgeCount(...args),
  displayLocalNotification: (...args) => adapter.displayLocalNotification(...args),
};

export function __resetPushForTests() {
  adapter = defaultAdapter;
}
