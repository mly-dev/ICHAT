/** ICH-111 : garde-fous sur les pièces jointes. */
import {
  checkSize,
  fileExtension,
  formatBytes,
  isImageMime,
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
} from '@/utils/files';

describe('tailles de fichiers', () => {
  it('formate en unités lisibles', () => {
    expect(formatBytes(512)).toBe('512 o');
    expect(formatBytes(2048)).toBe('2 Ko');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 Mo');
  });

  it('accepte une image sous la limite', () => {
    expect(checkSize(1024 * 1024, MAX_IMAGE_BYTES).ok).toBe(true);
  });

  it('refuse une image trop lourde avec un message explicite', () => {
    const result = checkSize(MAX_IMAGE_BYTES + 1, MAX_IMAGE_BYTES);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Maximum');
  });

  it('refuse un fichier au-delà de 20 Mo', () => {
    expect(checkSize(MAX_FILE_BYTES + 1, MAX_FILE_BYTES).ok).toBe(false);
  });

  it("laisse passer une taille inconnue plutôt que de bloquer l'envoi", () => {
    expect(checkSize(undefined, MAX_IMAGE_BYTES).ok).toBe(true);
  });

  it('reconnaît les images et les extensions', () => {
    expect(isImageMime('image/jpeg')).toBe(true);
    expect(isImageMime('application/pdf')).toBe(false);
    expect(fileExtension('cours.pdf')).toBe('PDF');
    expect(fileExtension('sans-extension')).toBe('');
  });
});
