import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

/** Au-delà de `max`, on affiche « 99+ » plutôt que d'élargir la pastille. */
export const Badge = memo(function Badge({ count, max = 99 }) {
  if (!count || count <= 0) return null;
  const label = count > max ? `${max}+` : String(count);

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}`}
    >
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
});
