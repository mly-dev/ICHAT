/**
 * Modèles partagés du périmètre messagerie.
 * Le contrat exact reste à valider avec Ibou (voir docs/API-CONTRACT.md) :
 * la couche `src/services/api/` normalise les réponses vers ces types, donc un
 * changement côté back se corrige à un seul endroit.
 */

export type UserId = string;
export type ConversationId = string;
export type MessageId = string;

export interface UserSummary {
  id: UserId;
  fullName: string;
  /** Adresse ADU, sert aussi d'identifiant lisible. */
  email?: string;
  avatarUrl?: string | null;
  /** Faculté / service, affiché sous le nom dans l'annuaire et les groupes. */
  department?: string | null;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: ConversationId;
  type: ConversationType;
  /** Nom affiché : nom du contact en direct, nom du groupe sinon. */
  title: string;
  avatarUrl?: string | null;
  /** Interlocuteur, uniquement pour une conversation directe. */
  peer?: UserSummary | null;
  lastMessage?: LastMessagePreview | null;
  unreadCount: number;
  /** ISO 8601, sert au tri par activité récente (ICH-016). */
  updatedAt: string;
  muted?: boolean;
}

export interface LastMessagePreview {
  id: MessageId;
  senderId: UserId;
  senderName?: string;
  /** Texte déjà résumé côté back ; pour un média, libellé court. */
  preview: string;
  kind: MessageKind;
  createdAt: string;
}

export type MessageKind = 'text' | 'image' | 'file' | 'system';

/** Statut d'acheminement d'un message sortant (ICH-025). */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageAttachment {
  id: string;
  kind: 'image' | 'file';
  url: string;
  /** Miniature si le back en fournit une : évite de tirer l'image pleine taille. */
  thumbnailUrl?: string | null;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface MessageReplyTo {
  id: MessageId;
  senderId: UserId;
  senderName?: string;
  preview: string;
  kind: MessageKind;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  senderId: UserId;
  senderName?: string;
  senderAvatarUrl?: string | null;
  kind: MessageKind;
  text?: string;
  attachments?: MessageAttachment[];
  replyTo?: MessageReplyTo | null;
  createdAt: string;
  status: MessageStatus;
  deletedAt?: string | null;
  /**
   * Identifiant local généré à l'envoi optimiste. Le back le renvoie pour qu'on
   * puisse réconcilier le message temporaire avec le message définitif (ICH-022).
   */
  clientId?: string;
}

export interface Paginated<T> {
  items: T[];
  /** Curseur à renvoyer pour la page suivante ; null quand on est au bout. */
  nextCursor: string | null;
  hasMore: boolean;
}

export type GroupRole = 'member' | 'admin';

export interface GroupMember extends UserSummary {
  role: GroupRole;
  joinedAt?: string;
}

export interface Group {
  id: ConversationId;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  membersCount: number;
  createdBy: UserId;
  createdAt: string;
  myRole: GroupRole;
}
