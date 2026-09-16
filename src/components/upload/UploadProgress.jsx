import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/** Barre de progression + annulation. Utilisable hors messagerie. */
export const UploadProgress = memo(function UploadProgress({
  progress,
  onCancel,
  label = 'Envoi en cours…',
}) {
  if (progress === null || progress === undefined) return null;
  const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <Text style={typography.caption}>
          {label} {percent}%
        </Text>
        {onCancel ? (
          <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.cancel}>Annuler</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancel: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colors.primary },
});
