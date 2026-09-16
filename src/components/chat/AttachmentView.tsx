/**
 * Rendu des pièces jointes dans une bulle (ICH-030, ICH-031, ICH-033).
 * L'image affiche la miniature quand le back en fournit une : tirer l'original
 * dans un fil de discussion coûte cher pour rien.
 */
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { MessageAttachment } from '@/types/models';
import { fileExtension, formatBytes } from '@/utils/files';

interface AttachmentViewProps {
  attachment: MessageAttachment;
  isOwn: boolean;
  onPressImage?: (attachment: MessageAttachment) => void;
  onPressFile?: (attachment: MessageAttachment) => void;
}

export const AttachmentView = memo(function AttachmentView({
  attachment,
  isOwn,
  onPressImage,
  onPressFile,
}: AttachmentViewProps) {
  if (attachment.kind === 'image') {
    return (
      <Pressable
        onPress={() => onPressImage?.(attachment)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Ouvrir l'image en plein écran"
      >
        <Image
          source={{ uri: attachment.thumbnailUrl || attachment.url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    );
  }

  const extension = fileExtension(attachment.name) || 'FICHIER';

  return (
    <Pressable
      onPress={() => onPressFile?.(attachment)}
      accessibilityRole="button"
      accessibilityLabel={`Télécharger ${attachment.name ?? 'le fichier'}`}
      style={[styles.file, isOwn ? styles.fileOwn : styles.fileOther]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeLabel} numberOfLines={1}>
          {extension.slice(0, 4)}
        </Text>
      </View>
      <View style={styles.fileText}>
        <Text style={[styles.fileName, isOwn ? styles.textOwn : styles.textOther]} numberOfLines={1}>
          {attachment.name ?? 'Fichier'}
        </Text>
        <Text style={[typography.caption, isOwn ? styles.metaOwn : null]}>
          {formatBytes(attachment.sizeBytes)}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  image: {
    width: 220,
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    minWidth: 200,
  },
  fileOwn: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileOther: { backgroundColor: colors.surfaceAlt },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600' },
  textOwn: { color: colors.textInverse },
  textOther: { color: colors.text },
  metaOwn: { color: 'rgba(255,255,255,0.75)' },
});
