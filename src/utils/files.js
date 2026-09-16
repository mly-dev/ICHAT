/** Aides sur les fichiers : tailles lisibles, types, garde-fous d'upload. */

/** Limites volontairement basses : les forfaits data sont chers au Niger. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function formatBytes(bytes) {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} o`;

  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export function fileExtension(name) {
  if (!name) return '';
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() || '').toUpperCase() : '';
}

export function isImageMime(mimeType) {
  return !!mimeType && mimeType.startsWith('image/');
}

/** Renvoie { ok, reason } ; `reason` est prêt à afficher. */
export function checkSize(bytes, limit) {
  if (bytes === undefined || bytes === null) return { ok: true };
  if (bytes <= limit) return { ok: true };
  return {
    ok: false,
    reason: `Fichier trop volumineux (${formatBytes(bytes)}). Maximum : ${formatBytes(limit)}.`,
  };
}
