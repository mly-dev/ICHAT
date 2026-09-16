/**
 * Composant d'upload d'images réutilisable (Sprint 0, point 4).
 *
 * Générique par contrat : il ne sait rien des conversations. Adam peut le poser
 * tel quel dans le profil ou ilimiMarket. Toute logique métier passe par
 * `onUploaded`.
 */
import React, { memo, useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { UploadProgress } from './UploadProgress';
import { useUpload } from './useUpload';

export const ImageUploader = memo(function ImageUploader({
  label = 'Ajouter une image',
  renderTrigger,
  sources = ['library', 'camera'],
  ...uploadOptions
}) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const { uploading, progress, error, pickAndUploadImage, cancel, clearError } =
    useUpload(uploadOptions);

  const open = useCallback(() => {
    clearError();
    if (sources.length === 1) {
      void pickAndUploadImage(sources[0]);
      return;
    }
    setSheetVisible(true);
  }, [clearError, pickAndUploadImage, sources]);

  const choose = useCallback(
    (source) => {
      setSheetVisible(false);
      void pickAndUploadImage(source);
    },
    [pickAndUploadImage]
  );

  return (
    <View>
      {renderTrigger ? (
        renderTrigger({ open, uploading })
      ) : (
        <Pressable
          onPress={open}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.trigger, pressed ? styles.pressed : null]}
        >
          <Text style={styles.triggerLabel}>{label}</Text>
        </Pressable>
      )}

      <UploadProgress progress={progress} onCancel={cancel} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetVisible(false)}>
          <View style={styles.sheet}>
            {sources.includes('camera') ? (
              <Pressable style={styles.sheetItem} onPress={() => choose('camera')} accessibilityRole="button">
                <Text style={typography.body}>Prendre une photo</Text>
              </Pressable>
            ) : null}
            {sources.includes('library') ? (
              <Pressable style={styles.sheetItem} onPress={() => choose('library')} accessibilityRole="button">
                <Text style={typography.body}>Choisir dans la galerie</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.sheetItem} onPress={() => setSheetVisible(false)} accessibilityRole="button">
              <Text style={[typography.body, styles.cancelLabel]}>Annuler</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  triggerLabel: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  error: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  sheetItem: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancelLabel: { color: colors.danger },
});
