/** Formatage des dates, en français, sans dépendance externe. */
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/** Heure courte, ex. « 14:32 » (ICH-024). */
export function formatTime(value) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Libellé compact pour la liste des conversations (ICH-014). */
export function formatConversationDate(value, now = new Date()) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (diffDays <= 0) return formatTime(date);
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return WEEKDAYS[date.getDay()] || '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${String(date.getFullYear()).slice(2)}`;
}

/** Séparateur de date dans le fil de discussion. */
export function formatDaySeparator(value, now = new Date()) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function isSameDay(a, b) {
  return startOfDay(toDate(a)) === startOfDay(toDate(b));
}
