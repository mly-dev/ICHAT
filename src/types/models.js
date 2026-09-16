/**
 * Modèles partagés du périmètre messagerie, décrits en JSDoc.
 *
 * Le projet est en JavaScript : ces définitions ne contraignent rien à
 * l'exécution, mais elles documentent la forme exacte des objets qui circulent
 * et donnent l'autocomplétion dans l'éditeur. Le contrat réel reste à valider
 * avec Ibou (docs/API-CONTRACT.md) ; la couche `src/services/api/` normalise
 * les réponses vers ces formes, donc un changement côté back se corrige à un
 * seul endroit.
 *
 * @typedef {Object} UserSummary
 * @property {string} id
 * @property {string} fullName
 * @property {string} [email]        Adresse ADU
 * @property {?string} [avatarUrl]
 * @property {?string} [department]  Faculté ou service
 *
 * @typedef {'direct'|'group'} ConversationType
 * @typedef {'text'|'image'|'file'|'system'} MessageKind
 * @typedef {'pending'|'sent'|'delivered'|'read'|'failed'} MessageStatus
 * @typedef {'member'|'admin'} GroupRole
 *
 * @typedef {Object} LastMessagePreview
 * @property {string} id
 * @property {string} senderId
 * @property {string} [senderName]
 * @property {string} preview
 * @property {MessageKind} kind
 * @property {string} createdAt
 *
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {ConversationType} type
 * @property {string} title              Nom du contact, ou nom du groupe
 * @property {?string} [avatarUrl]
 * @property {?UserSummary} [peer]       Interlocuteur, en conversation directe
 * @property {?LastMessagePreview} [lastMessage]
 * @property {number} unreadCount
 * @property {string} updatedAt          Sert au tri par activité récente
 *
 * @typedef {Object} MessageAttachment
 * @property {string} id
 * @property {'image'|'file'} kind
 * @property {string} url
 * @property {?string} [thumbnailUrl]    Évite de tirer l'image pleine taille
 * @property {string} [name]
 * @property {string} [mimeType]
 * @property {number} [sizeBytes]
 *
 * @typedef {Object} MessageReplyTo
 * @property {string} id
 * @property {string} senderId
 * @property {string} [senderName]
 * @property {string} preview
 * @property {MessageKind} kind
 *
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} conversationId
 * @property {string} senderId
 * @property {string} [senderName]
 * @property {MessageKind} kind
 * @property {string} [text]
 * @property {MessageAttachment[]} [attachments]
 * @property {?MessageReplyTo} [replyTo]
 * @property {string} createdAt
 * @property {MessageStatus} status
 * @property {?string} [deletedAt]
 * @property {string} [clientId]  Identifiant local, renvoyé par le back pour
 *                                réconcilier le message optimiste
 *
 * @typedef {Object} GroupMember
 * @property {string} id
 * @property {string} fullName
 * @property {GroupRole} role
 * @property {string} [email]
 * @property {?string} [avatarUrl]
 * @property {?string} [department]
 *
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} name
 * @property {?string} [description]
 * @property {?string} [avatarUrl]
 * @property {number} membersCount
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {GroupRole} myRole
 */

export {};
