/**
 * Fusion et ordonnancement des messages.
 *
 * Isolé du store parce que c'est la partie qui casse en vrai : après une
 * coupure, les messages arrivent en désordre, en double, et le message
 * optimiste local doit être remplacé par sa version serveur. Fonctions pures,
 * donc testables sans React ni socket.
 */
import type { Message } from '@/types/models';

/** Un message local est reconnu par son clientId, un message serveur par son id. */
function sameMessage(a: Message, b: Message): boolean {
  if (a.id === b.id) return true;
  if (a.clientId && b.clientId && a.clientId === b.clientId) return true;
  return false;
}

function compare(a: Message, b: Message): number {
  const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (delta !== 0) return delta;
  // Même horodatage : on départage par id pour que l'ordre reste stable d'un
  // rendu à l'autre (sinon la liste saute sous le doigt).
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Tri chronologique croissant, ordre stable. */
export function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(compare);
}

/**
 * Le message serveur gagne, sauf pour le statut : un `pending` local qui vient
 * d'être confirmé passe à `sent`, mais on ne redescend jamais un `read` vers un
 * `sent` à cause d'un événement arrivé en retard.
 */
const STATUS_RANK: Record<Message['status'], number> = {
  failed: 0,
  pending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

export function mergeOne(existing: Message, incoming: Message): Message {
  const keepStatus =
    STATUS_RANK[existing.status] > STATUS_RANK[incoming.status] ? existing.status : incoming.status;

  return {
    ...existing,
    ...incoming,
    status: keepStatus,
    // Le serveur ne renvoie pas toujours le clientId : on ne le perd pas.
    clientId: incoming.clientId ?? existing.clientId,
  };
}

/**
 * Insère ou met à jour un message dans une liste triée, sans doublon.
 * Retourne une nouvelle liste (le store compare par référence).
 */
export function upsertMessage(messages: Message[], incoming: Message): Message[] {
  const index = messages.findIndex((message) => sameMessage(message, incoming));
  if (index >= 0) {
    const current = messages[index];
    if (!current) return messages;
    const merged = mergeOne(current, incoming);
    const next = [...messages];
    next[index] = merged;
    // L'horodatage serveur peut différer de l'horodatage optimiste : on retrie.
    return current.createdAt === merged.createdAt ? next : sortMessages(next);
  }
  return sortMessages([...messages, incoming]);
}

/** Fusionne une page d'historique ou un lot de resynchronisation. */
export function mergeMessages(messages: Message[], incoming: Message[]): Message[] {
  if (!incoming.length) return messages;
  return incoming.reduce(upsertMessage, messages);
}

/** Date du message le plus récent : point de reprise après une coupure. */
export function lastMessageDate(messages: Message[]): string | null {
  let latest: string | null = null;
  for (const message of messages) {
    if (!latest || Date.parse(message.createdAt) > Date.parse(latest)) latest = message.createdAt;
  }
  return latest;
}
