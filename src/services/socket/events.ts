/**
 * Catalogue des événements temps réel.
 *
 * Ce fichier est le contrat côté app : tant qu'Ibou n'a pas confirmé les noms,
 * c'est ici qu'on les corrige, pas dans les écrans.
 */
import type { ConversationId, Message, MessageId, MessageStatus, UserId } from '@/types/models';

/** Événements reçus du serveur. */
export interface ServerEvents {
  'message:new': { message: Message };
  'message:updated': { message: Message };
  'message:deleted': { conversationId: ConversationId; messageId: MessageId };
  'message:status': {
    conversationId: ConversationId;
    messageId: MessageId;
    status: MessageStatus;
  };
  'conversation:read': {
    conversationId: ConversationId;
    userId: UserId;
    lastReadMessageId?: MessageId;
  };
  'conversation:updated': { conversationId: ConversationId; unreadCount?: number };
  'group:updated': { conversationId: ConversationId; name?: string };
}

/** Événements émis par l'app. */
export interface ClientEvents {
  'conversation:join': { conversationId: ConversationId };
  'conversation:leave': { conversationId: ConversationId };
  'conversation:read': { conversationId: ConversationId; lastMessageId?: MessageId };
}

export type ServerEventName = keyof ServerEvents;
export type ClientEventName = keyof ClientEvents;

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
