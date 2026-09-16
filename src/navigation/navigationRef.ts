import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Référence globale : nécessaire pour naviguer depuis un tap sur une
 * notification, donc hors de l'arbre React (ICH-055).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}
