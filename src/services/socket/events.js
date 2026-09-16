/**
 * Catalogue des événements temps réel.
 *
 * C'est le contrat côté app : tant qu'Ibou n'a pas confirmé les noms, c'est ici
 * qu'on les corrige, pas dans les écrans.
 *
 * Enveloppe supposée sur le fil : { "event": "<nom>", "payload": { … } }
 * — à valider (question 5 de docs/API-CONTRACT.md).
 */

/** Serveur → app. */
export const ServerEvents = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_STATUS: 'message:status',
  CONVERSATION_READ: 'conversation:read',
  CONVERSATION_UPDATED: 'conversation:updated',
  GROUP_UPDATED: 'group:updated',
};

/** App → serveur. */
export const ClientEvents = {
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  CONVERSATION_READ: 'conversation:read',
};

/**
 * Formes attendues, pour mémoire :
 * - message:new / message:updated → { message: Message }
 * - message:deleted              → { conversationId, messageId }
 * - message:status               → { conversationId, messageId, status }
 * - conversation:read            → { conversationId, userId, lastReadMessageId }
 * - conversation:updated         → { conversationId, unreadCount }
 * - group:updated                → { conversationId, name }
 */
export const SocketStatus = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  OFFLINE: 'offline',
};
