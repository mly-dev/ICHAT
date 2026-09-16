import React, { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme';

/** Repères d'acheminement (ICH-025). Texte plutôt qu'icônes : zéro asset à charger. */
const LABELS = { pending: '🕓', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' };

const ACCESSIBLE_LABELS = {
  pending: "En cours d'envoi",
  sent: 'Envoyé',
  delivered: 'Reçu',
  read: 'Lu',
  failed: "Échec de l'envoi",
};

export const MessageStatusIcon = memo(function MessageStatusIcon({ status }) {
  return (
    <Text
      style={[
        styles.base,
        status === 'read' ? styles.read : null,
        status === 'failed' ? styles.failed : null,
      ]}
      accessibilityLabel={ACCESSIBLE_LABELS[status]}
    >
      {LABELS[status]}
    </Text>
  );
});

const styles = StyleSheet.create({
  base: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  read: { color: '#9AD4FF' },
  failed: { color: colors.warning, fontWeight: '700' },
});
