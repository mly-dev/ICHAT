import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/theme';

/**
 * Écran vide volontaire. Les écrans d'Adam doivent exister dans la navigation
 * pour que les parcours soient testables, mais je ne les implémente pas.
 */
export function Placeholder({ title, owner = 'Adam', backlog }) {
  return (
    <View style={styles.container}>
      <Text style={typography.subtitle}>{title}</Text>
      <Text style={[typography.bodyMuted, styles.text]}>
        Écran à la charge de {owner}
        {backlog ? ` (${backlog})` : ''}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  text: { textAlign: 'center' },
});
