/** Sélection de fichiers (ICH-032). Générique, comme le sélecteur d'images. */
import * as DocumentPicker from 'expo-document-picker';

import type { UploadSource } from '@/services/api';

export async function pickDocument(): Promise<UploadSource | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    name: asset.name ?? `fichier_${Date.now()}`,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    sizeBytes: asset.size ?? undefined,
  };
}
