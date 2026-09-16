/**
 * États transverses : chargement, vide, erreur.
 * Tous mes écrans les réutilisent, on ne refait pas de variante locale.
 */
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Button } from './Button';

export const LoadingState = memo(function LoadingState({ label = 'Chargement…' }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.primary} />
      <Text style={[typography.bodyMuted, styles.text]}>{label}</Text>
    </View>
  );
});

export const EmptyState = memo(function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      <Text style={[typography.subtitle, styles.text]}>{title}</Text>
      {description ? <Text style={[typography.bodyMuted, styles.text]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
});

export const ErrorState = memo(function ErrorState({ message, onRetry, retryLabel = 'Réessayer' }) {
  return (
    <View style={styles.container}>
      <Text style={[typography.subtitle, styles.text]}>Une erreur est survenue</Text>
      <Text style={[typography.bodyMuted, styles.text]}>{message}</Text>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  text: { textAlign: 'center' },
  action: { marginTop: spacing.md, minWidth: 160 },
});
