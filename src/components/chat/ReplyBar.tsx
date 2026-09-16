import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';
import type { Message } from '@/types/models';

interface ReplyBarProps {
  message: Message;
  onCancel: () => void;
}

/** Barre de citation affichée au-dessus du champ de saisie (ICH-027). */
export const ReplyBar = memo(function ReplyBar({ message, onCancel }: ReplyBarProps) {
  const preview =
    message.text ?? (message.kind === 'image' ? '📷 Photo' : message.kind === 'file' ? '📎 Fichier' : '');

  return (
    <View style={styles.container}>
      <View style={styles.bar} />
      <View style={styles.content}>
        <Text style={styles.author} numberOfLines={1}>
          Réponse à {message.senderName ?? 'ce message'}
        </Text>
        <Text style={typography.caption} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Annuler la réponse">
        <Text style={styles.close}>✕</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bar: { width: 3, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 2 },
  content: { flex: 1 },
  author: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  close: { fontSize: 16, color: colors.textMuted, paddingHorizontal: spacing.xs },
});
