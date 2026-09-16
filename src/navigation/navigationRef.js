import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Référence globale : nécessaire pour naviguer depuis un tap sur une
 * notification, donc hors de l'arbre React (ICH-055).
 */
export const navigationRef = createNavigationContainerRef();

export function isNavigationReady() {
  return navigationRef.isReady();
}
