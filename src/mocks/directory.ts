/**
 * MOCK — l'annuaire ADU est à Adam (ICH-034 à ICH-043).
 *
 * Mon sélecteur de membres de groupe (ICH-045) a besoin d'une source de
 * personnes. Tant que l'écran d'Adam n'existe pas, il lit ici. Quand il livre,
 * on remplace l'implémentation de `searchDirectory` par un appel à son service.
 */
import type { UserSummary } from '@/types/models';

const PEOPLE: UserSummary[] = [
  { id: 'u1', fullName: 'Aïcha Abdou', email: 'aicha.abdou@adu.ne', department: 'Lettres' },
  { id: 'u2', fullName: 'Ibrahim Salou', email: 'ibrahim.salou@adu.ne', department: 'Informatique' },
  { id: 'u3', fullName: 'Fatima Moussa', email: 'fatima.moussa@adu.ne', department: 'Droit' },
  { id: 'u4', fullName: 'Adam Yacouba', email: 'adam.yacouba@adu.ne', department: 'Informatique' },
  { id: 'u5', fullName: 'Hadiza Amadou', email: 'hadiza.amadou@adu.ne', department: 'Sciences' },
  { id: 'u6', fullName: 'Oumarou Garba', email: 'oumarou.garba@adu.ne', department: 'Scolarité' },
  { id: 'u7', fullName: 'Zeinabou Idrissa', email: 'zeinabou.idrissa@adu.ne', department: 'Bibliothèque' },
  { id: 'u8', fullName: 'Boubacar Maïga', email: 'boubacar.maiga@adu.ne', department: 'Économie' },
];

export async function searchDirectory(query: string): Promise<UserSummary[]> {
  const normalized = query.trim().toLowerCase();
  // Petite latence simulée : sans elle on ne voit jamais les états de chargement.
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (!normalized) return PEOPLE;
  return PEOPLE.filter(
    (person) =>
      person.fullName.toLowerCase().includes(normalized) ||
      (person.email ?? '').toLowerCase().includes(normalized) ||
      (person.department ?? '').toLowerCase().includes(normalized)
  );
}

export function getDirectoryUser(id: string): UserSummary | undefined {
  return PEOPLE.find((person) => person.id === id);
}
