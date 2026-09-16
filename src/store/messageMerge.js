/**
 * Fusion et ordonnancement des messages.
 *
 * Isolé du store parce que c'est la partie qui casse en vrai : après une
 * coupure, les messages arrivent en désordre, en double, et le message
 * optimiste local doit être remplacé par sa version serveur. Fonctions pures,
 * donc testables sans React ni socket.
 */

/** Un message local est reconnu par son clientId, un message serveur par son id. */
function sameMessage(a, b) {
  if (a.id === b.id) return true;
  if (a.clientId && b.clientId && a.clientId === b.clientId) return true;
  return false;
}

function compare(a, b) {
  const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (delta !== 0) return delta;
  // Même horodatage : on départage par id pour que l'ordre reste stable d'un
  // rendu à l'autre, sinon la liste saute sous le doigt.
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/** Tri chronologique croissant, ordre stable. */
export function sortMessages(messages) {
  return [...messages].sort(compare);
}

const STATUS_RANK = { failed: 0, pending: 1, sent: 2, delivered: 3, read: 4 };

/**
 * Règles de statut :
 * - un `pending` confirmé passe à `sent`, mais un `read` ne redescend jamais
 *   vers `sent` à cause d'un événement arrivé en retard ;
 * - `failed` est un état purement local, produit par la file d'envoi : il doit
 *   pouvoir marquer un `pending`, sans jamais effacer un statut déjà confirmé
 *   par le serveur ;
 * - un message `failed` qui finit par être confirmé repasse au statut serveur.
 */
export function resolveStatus(existing, incoming) {
  if (incoming === 'failed') {
    return existing === 'pending' || existing === 'failed' ? 'failed' : existing;
  }
  if (existing === 'failed') return incoming;
  return STATUS_RANK[existing] > STATUS_RANK[incoming] ? existing : incoming;
}

export function mergeOne(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    status: resolveStatus(existing.status, incoming.status),
    // Le serveur ne renvoie pas toujours le clientId : on ne le perd pas.
    clientId: incoming.clientId || existing.clientId,
  };
}

/** Insère ou met à jour un message dans une liste triée, sans doublon. */
export function upsertMessage(messages, incoming) {
  const index = messages.findIndex((message) => sameMessage(message, incoming));
  if (index >= 0) {
    const current = messages[index];
    const merged = mergeOne(current, incoming);
    const next = [...messages];
    next[index] = merged;
    // L'horodatage serveur peut différer de l'horodatage optimiste : on retrie.
    return current.createdAt === merged.createdAt ? next : sortMessages(next);
  }
  return sortMessages([...messages, incoming]);
}

/** Fusionne une page d'historique ou un lot de resynchronisation. */
export function mergeMessages(messages, incoming) {
  if (!incoming || !incoming.length) return messages;
  return incoming.reduce(upsertMessage, messages);
}

/** Date du message le plus récent : point de reprise après une coupure. */
export function lastMessageDate(messages) {
  let latest = null;
  for (const message of messages) {
    if (!latest || Date.parse(message.createdAt) > Date.parse(latest)) latest = message.createdAt;
  }
  return latest;
}
