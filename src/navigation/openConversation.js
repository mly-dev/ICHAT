/**
 * Point d'entrée unique vers la messagerie depuis le reste de l'app.
 *
 * ⚠️ Signature figée, convenue avec Adam : ses écrans (annuaire, profil,
 * ilimiMarket) appellent `openConversation(userId)` et rien d'autre. Toute la
 * résolution « utilisateur → conversation » est de mon côté.
 */
import { conversationsApi } from '@/services/api';
import { logger } from '@/utils/logger';

import { navigationRef } from './navigationRef';

export async function openConversation(userId) {
  if (!navigationRef.isReady()) return;

  // On navigue tout de suite avec `peerId` : l'écran affiche son état de
  // chargement au lieu de laisser l'utilisateur devant un écran figé le temps
  // de l'aller-retour réseau, souvent long ici.
  navigationRef.navigate('Chat', { conversationId: '', peerId: userId });

  try {
    await conversationsApi.openDirect(userId);
  } catch (error) {
    logger.warn('navigation', 'openConversation', error);
  }
}

/** Variante interne quand la conversation est déjà connue. */
export function openConversationById(conversationId, title) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Chat', { conversationId, title });
}
