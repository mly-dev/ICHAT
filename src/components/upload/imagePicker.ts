/**
 * Sélection et compression d'images. Générique : ce module est partagé avec
 * Adam (photo de profil, annonces ilimiMarket), il ne connaît pas la messagerie.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { UploadSource } from '@/services/api';
import { logger } from '@/utils/logger';

export type PickSource = 'library' | 'camera';

export interface PickImageOptions {
  /** Largeur maximale après compression. 1280 suffit pour un écran de téléphone. */
  maxWidth?: number;
  /** Qualité JPEG, 0 → 1. Basse par défaut : les forfaits data sont chers. */
  quality?: number;
  allowsEditing?: boolean;
}

const DEFAULTS: Required<PickImageOptions> = {
  maxWidth: 1280,
  quality: 0.6,
  allowsEditing: false,
};

export class PermissionDeniedError extends Error {
  constructor(source: PickSource) {
    super(
      source === 'camera'
        ? "L'accès à la caméra a été refusé."
        : "L'accès aux photos a été refusé."
    );
    this.name = 'PermissionDeniedError';
  }
}

async function ensurePermission(source: PickSource): Promise<void> {
  const result =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!result.granted) throw new PermissionDeniedError(source);
}

/**
 * Ouvre la galerie ou la caméra, compresse le résultat et renvoie une source
 * prête à téléverser. `null` signifie que l'utilisateur a annulé.
 */
export async function pickImage(
  source: PickSource,
  options: PickImageOptions = {}
): Promise<UploadSource | null> {
  const { maxWidth, quality, allowsEditing } = { ...DEFAULTS, ...options };
  await ensurePermission(source);

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing,
    quality: 1, // on compresse nous-mêmes, après redimensionnement
    exif: false, // pas de métadonnées : poids inutile et données de localisation
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  return compressImage(asset, { maxWidth, quality });
}

async function compressImage(
  asset: ImagePicker.ImagePickerAsset,
  { maxWidth, quality }: { maxWidth: number; quality: number }
): Promise<UploadSource> {
  const name = asset.fileName ?? `photo_${Date.now()}.jpg`;

  try {
    const needsResize = !!asset.width && asset.width > maxWidth;
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      needsResize ? [{ resize: { width: maxWidth } }] : [],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return {
      uri: manipulated.uri,
      name: name.replace(/\.[^.]+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: asset.fileSize,
    };
  } catch (error) {
    // Compression impossible : on préfère envoyer l'original plutôt que rien.
    logger.warn('upload', 'compression impossible', error);
    return {
      uri: asset.uri,
      name,
      mimeType: asset.mimeType ?? 'image/jpeg',
      sizeBytes: asset.fileSize,
    };
  }
}
