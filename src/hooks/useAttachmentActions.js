import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { logger } from '@/utils/logger';

/**
 * Ouverture des pièces jointes (ICH-031, ICH-033).
 * Le téléchargement est délégué au système : il gère déjà la reprise, le
 * dossier de destination et les applications capables d'ouvrir le fichier.
 */
export function useAttachmentActions(openImage) {
  const onPressImage = useCallback((attachment) => openImage(attachment), [openImage]);

  const onPressFile = useCallback(async (attachment) => {
    try {
      const canOpen = await Linking.canOpenURL(attachment.url);
      if (!canOpen) {
        Alert.alert('Téléchargement', "Aucune application ne peut ouvrir ce fichier.");
        return;
      }
      await Linking.openURL(attachment.url);
    } catch (error) {
      logger.warn('attachments', 'openFile', error);
      Alert.alert('Téléchargement', "Le fichier n'a pas pu être ouvert.");
    }
  }, []);

  return { onPressImage, onPressFile };
}
