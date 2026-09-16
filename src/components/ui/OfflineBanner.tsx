import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, spacing, typography } from '@/theme';

/**
 * Bandeau hors-ligne, affiché en haut de mes écrans. Volontairement discret :
 * l'app reste utilisable hors-ligne, les envois partent au retour du réseau.
 */
export const OfflineBanner = memo(function OfflineBanner() {
  const online = useNetworkStatus();
  if (online) return null;
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={[typography.caption, styles.text]}>
        Hors connexion — vos messages partiront au retour du réseau
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  text: { color: colors.textInverse, textAlign: 'center' },
});
