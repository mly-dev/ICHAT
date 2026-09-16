/**
 * Hook d'upload réutilisable : sélection → compression → téléversement, avec
 * progression et annulation. Aucune dépendance à la messagerie.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { toUserMessage, uploadsApi, type UploadSource } from '@/services/api';
import type { MessageAttachment } from '@/types/models';
import { checkSize, MAX_FILE_BYTES, MAX_IMAGE_BYTES } from '@/utils/files';

import { pickDocument } from './documentPicker';
import { PermissionDeniedError, pickImage, type PickImageOptions, type PickSource } from './imagePicker';

export interface UseUploadOptions {
  /** Appelé quand le fichier est en ligne et exploitable. */
  onUploaded?: (attachment: MessageAttachment) => void;
  onError?: (message: string) => void;
  imageOptions?: PickImageOptions;
  maxImageBytes?: number;
  maxFileBytes?: number;
}

export interface UseUploadResult {
  uploading: boolean;
  /** Progression 0 → 1, `null` tant que rien n'est en cours. */
  progress: number | null;
  error: string | null;
  pickAndUploadImage: (source: PickSource) => Promise<MessageAttachment | null>;
  pickAndUploadDocument: () => Promise<MessageAttachment | null>;
  cancel: () => void;
  clearError: () => void;
}

export function useUpload(options: UseUploadOptions = {}): UseUploadResult {
  const {
    onUploaded,
    onError,
    imageOptions,
    maxImageBytes = MAX_IMAGE_BYTES,
    maxFileBytes = MAX_FILE_BYTES,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    },
    []
  );

  const fail = useCallback(
    (message: string) => {
      if (mountedRef.current) setError(message);
      onError?.(message);
      return null;
    },
    [onError]
  );

  const run = useCallback(
    async (source: UploadSource, limit: number): Promise<MessageAttachment | null> => {
      const sizeCheck = checkSize(source.sizeBytes, limit);
      if (!sizeCheck.ok) return fail(sizeCheck.reason ?? 'Fichier trop volumineux.');

      const controller = new AbortController();
      controllerRef.current = controller;
      if (mountedRef.current) {
        setUploading(true);
        setProgress(0);
        setError(null);
      }

      try {
        const attachment = await uploadsApi.upload(source, {
          signal: controller.signal,
          onProgress: (ratio) => {
            if (mountedRef.current) setProgress(ratio);
          },
        });
        onUploaded?.(attachment);
        return attachment;
      } catch (uploadError) {
        if (controller.signal.aborted) return null; // annulation volontaire
        return fail(toUserMessage(uploadError));
      } finally {
        controllerRef.current = null;
        if (mountedRef.current) {
          setUploading(false);
          setProgress(null);
        }
      }
    },
    [fail, onUploaded]
  );

  const pickAndUploadImage = useCallback(
    async (source: PickSource) => {
      try {
        const picked = await pickImage(source, imageOptions);
        if (!picked) return null;
        return run(picked, maxImageBytes);
      } catch (pickError) {
        if (pickError instanceof PermissionDeniedError) return fail(pickError.message);
        return fail(toUserMessage(pickError));
      }
    },
    [fail, imageOptions, maxImageBytes, run]
  );

  const pickAndUploadDocument = useCallback(async () => {
    try {
      const picked = await pickDocument();
      if (!picked) return null;
      return run(picked, maxFileBytes);
    } catch (pickError) {
      return fail(toUserMessage(pickError));
    }
  }, [fail, maxFileBytes, run]);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    uploading,
    progress,
    error,
    pickAndUploadImage,
    pickAndUploadDocument,
    cancel,
    clearError,
  };
}
