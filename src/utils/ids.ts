/** Identifiants locaux, utilisés pour les envois optimistes. */
let counter = 0;

export function createClientId(prefix = 'loc'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${random}`;
}

export function isClientId(id: string): boolean {
  return id.startsWith('loc_') || id.startsWith('tmp_');
}
