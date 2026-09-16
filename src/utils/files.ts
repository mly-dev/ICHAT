/** Aides sur les fichiers : tailles lisibles, types, garde-fous d'upload. */

/** Limites volontairement basses : les forfaits data sont chers au Niger. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo après compression
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 Mo

export function formatBytes(bytes?: number | null): string {
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

export function fileExtension(name?: string | null): string {
  if (!name) return '';
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toUpperCase() : '';
}

export function isImageMime(mimeType?: string | null): boolean {
  return !!mimeType && mimeType.startsWith('image/');
}

export interface SizeCheck {
  ok: boolean;
  /** Message prêt à afficher quand le fichier est refusé. */
  reason?: string;
}

export function checkSize(bytes: number | undefined, limit: number): SizeCheck {
  if (bytes === undefined) return { ok: true };
  if (bytes <= limit) return { ok: true };
  return {
    ok: false,
    reason: `Fichier trop volumineux (${formatBytes(bytes)}). Maximum : ${formatBytes(limit)}.`,
  };
}
