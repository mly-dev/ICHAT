/**
 * Hook d'upload réutilisable : sélection → compression → téléversement, avec
 * progression et annulation. Aucune dépendance à la messagerie : il est partagé
 * avec Adam (photo de profil, annonces ilimiMarket).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { toUserMessage, uploadsApi } from '@/services/api';
import { MediaUnavailableError, pickDocument, pickImage } from '@/services/native/media';
import { checkSize, MAX_FILE_BYTES, MAX_IMAGE_BYTES } from '@/utils/files';

export function useUpload({
  onUploaded,
  onError,
  imageOptions,
  maxImageBytes = MAX_IMAGE_BYTES,
  maxFileBytes = MAX_FILE_BYTES,
} = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (controllerRef.current) controllerRef.current.abort();
    },
    []
  );

  const fail = useCallback(
    (message) => {
      if (mountedRef.current) setError(message);
      if (onError) onError(message);
      return null;
    },
    [onError]
  );

  const run = useCallback(
    async (source, limit) => {
      const sizeCheck = checkSize(source.sizeBytes, limit);
      if (!sizeCheck.ok) return fail(sizeCheck.reason || 'Fichier trop volumineux.');

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
        if (onUploaded) onUploaded(attachment);
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
    async (source) => {
      try {
        const picked = await pickImage(source, imageOptions);
        if (!picked) return null;
        return run(picked, maxImageBytes);
      } catch (pickError) {
        if (pickError instanceof MediaUnavailableError) return fail(pickError.message);
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
      if (pickError instanceof MediaUnavailableError) return fail(pickError.message);
      return fail(toUserMessage(pickError));
    }
  }, [fail, maxFileBytes, run]);

  const cancel = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
  }, []);

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
