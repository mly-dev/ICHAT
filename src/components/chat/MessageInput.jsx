import React, { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * Champ de saisie. Le texte reste local au composant : remonter chaque frappe
 * dans un store ferait re-rendre tout le fil à chaque lettre.
 */
export const MessageInput = memo(function MessageInput({
  onSend,
  onAttach,
  disabled = false,
  placeholder = 'Votre message…',
}) {
  const [value, setValue] = useState('');
  const canSend = value.trim().length > 0 && !disabled;

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue('');
    onSend(trimmed);
  }, [onSend, value]);

  return (
    <View style={styles.container}>
      {onAttach ? (
        <Pressable
          onPress={onAttach}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Joindre un fichier"
          style={styles.attach}
        >
          <Text style={styles.attachIcon}>＋</Text>
        </Pressable>
      ) : null}

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={4000}
        editable={!disabled}
        accessibilityLabel="Champ de saisie du message"
      />

      <Pressable
        onPress={submit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Envoyer"
        style={[styles.send, !canSend ? styles.sendDisabled : null]}
      >
        <Text style={styles.sendIcon}>➤</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attach: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  attachIcon: { fontSize: 22, color: colors.primary, lineHeight: 24 },
  input: {
    ...typography.body,
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: { opacity: 0.4 },
  sendIcon: { color: colors.textInverse, fontSize: 16 },
});
