/**
 * Transforme la liste de messages en lignes affichables, séparateurs de date
 * compris, dans l'ordre d'une liste inversée (le plus récent en premier).
 * Fonction pure : testable sans rendu.
 */
import { isSameDay } from '@/utils/time';

export function buildChatItems(messages, currentUserId) {
  const items = [];

  messages.forEach((message, index) => {
    const previous = index > 0 ? messages[index - 1] : undefined;

    // Nouveau jour par rapport au message précédent → séparateur.
    if (!previous || !isSameDay(previous.createdAt, message.createdAt)) {
      items.push({ type: 'day', key: `day_${message.createdAt}`, date: message.createdAt });
    }

    // En groupe, on ne répète pas l'auteur sur des messages consécutifs.
    const showSender =
      message.senderId !== currentUserId &&
      (!previous ||
        previous.senderId !== message.senderId ||
        !isSameDay(previous.createdAt, message.createdAt));

    items.push({
      type: 'message',
      key: message.clientId || message.id,
      message,
      showSender,
    });
  });

  // La liste est rendue inversée : on renvoie du plus récent au plus ancien.
  return items.reverse();
}
