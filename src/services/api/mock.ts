/**
 * Back-end simulé, actif uniquement quand EXPO_PUBLIC_USE_MOCKS=1.
 *
 * Il existe pour deux raisons : le back d'Ibou n'est pas encore déployé, et on a
 * besoin de reproduire un réseau nigérien (latence, échecs aléatoires) sans
 * écrire de données en dur dans les composants.
 */
import { getDirectoryUser, searchDirectory } from '@/mocks';
import type {
  Conversation,
  Group,
  GroupMember,
  Message,
  MessageAttachment,
  Paginated,
} from '@/types/models';
import { createClientId } from '@/utils/ids';

import { ApiError } from './errors';
import type { CreateGroupPayload, UpdateGroupPayload } from './groups';
import type { ListMessagesParams, SendMessagePayload } from './messages';
import type { NotificationPreferencesDto, RegisterDevicePayload } from './notifications';
import type { UploadOptions, UploadSource } from './uploads';

const ME = 'me';

/** Latence simulée : volontairement élevée, c'est le vrai terrain. */
const LATENCY_MS = 350;
/** Taux d'échec simulé, pour exercer les états d'erreur et la file de réessai. */
const FAILURE_RATE = 0;

function wait(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeFail(): Promise<void> {
  await wait();
  if (FAILURE_RATE > 0 && Math.random() < FAILURE_RATE) {
    throw new ApiError('network', 'Connexion instable (simulée).');
  }
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const conversations = new Map<string, Conversation>();
const messagesByConversation = new Map<string, Message[]>();
const groups = new Map<string, Group>();
const groupMembers = new Map<string, GroupMember[]>();

let preferences: NotificationPreferencesDto = {
  enabled: true,
  directMessages: true,
  groupMessages: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};
const devices = new Set<string>();

function seed() {
  if (conversations.size) return;

  const seedConversations: Conversation[] = [
    {
      id: 'c1',
      type: 'direct',
      title: 'Aïcha Abdou',
      peer: getDirectoryUser('u1') ?? null,
      unreadCount: 2,
      updatedAt: isoMinutesAgo(3),
      lastMessage: {
        id: 'm-c1-3',
        senderId: 'u1',
        senderName: 'Aïcha Abdou',
        preview: 'On se retrouve à la bibliothèque ?',
        kind: 'text',
        createdAt: isoMinutesAgo(3),
      },
    },
    {
      id: 'c2',
      type: 'group',
      title: 'Licence 3 Informatique',
      unreadCount: 0,
      updatedAt: isoMinutesAgo(48),
      lastMessage: {
        id: 'm-c2-2',
        senderId: 'u2',
        senderName: 'Ibrahim Salou',
        preview: 'Le TP est reporté à jeudi.',
        kind: 'text',
        createdAt: isoMinutesAgo(48),
      },
    },
    {
      id: 'c3',
      type: 'direct',
      title: 'Oumarou Garba',
      peer: getDirectoryUser('u6') ?? null,
      unreadCount: 0,
      updatedAt: isoMinutesAgo(60 * 26),
      lastMessage: {
        id: 'm-c3-1',
        senderId: ME,
        senderName: 'Moi',
        preview: 'Merci pour le document.',
        kind: 'text',
        createdAt: isoMinutesAgo(60 * 26),
      },
    },
  ];

  seedConversations.forEach((conversation) => conversations.set(conversation.id, conversation));

  messagesByConversation.set('c1', [
    buildMessage('m-c1-1', 'c1', 'u1', 'Salam Momo, tu es à la fac aujourd’hui ?', 120),
    buildMessage('m-c1-2', 'c1', ME, 'Oui, je passe vers 10h.', 118),
    buildMessage('m-c1-3', 'c1', 'u1', 'On se retrouve à la bibliothèque ?', 3),
  ]);
  messagesByConversation.set('c2', [
    buildMessage('m-c2-1', 'c2', 'u4', 'Bonjour à tous, le cours de demain est en amphi B.', 200),
    buildMessage('m-c2-2', 'c2', 'u2', 'Le TP est reporté à jeudi.', 48),
  ]);
  messagesByConversation.set('c3', [
    buildMessage('m-c3-1', 'c3', ME, 'Merci pour le document.', 60 * 26),
  ]);

  groups.set('c2', {
    id: 'c2',
    name: 'Licence 3 Informatique',
    description: 'Groupe de la promotion L3 Info',
    avatarUrl: null,
    membersCount: 4,
    createdBy: 'u4',
    createdAt: isoMinutesAgo(60 * 24 * 30),
    myRole: 'admin',
  });
  groupMembers.set('c2', [
    { ...(getDirectoryUser('u4') as GroupMember), role: 'admin' },
    { ...(getDirectoryUser('u2') as GroupMember), role: 'member' },
    { ...(getDirectoryUser('u5') as GroupMember), role: 'member' },
    { id: ME, fullName: 'Moi', email: 'momo@adu.ne', role: 'member' },
  ]);
}

function buildMessage(
  id: string,
  conversationId: string,
  senderId: string,
  text: string,
  minutesAgo: number
): Message {
  const directoryUser = senderId === ME ? undefined : getDirectoryUser(senderId);
  return {
    id,
    conversationId,
    senderId,
    senderName: senderId === ME ? 'Moi' : directoryUser?.fullName,
    kind: 'text',
    text,
    createdAt: isoMinutesAgo(minutesAgo),
    status: senderId === ME ? 'read' : 'delivered',
  };
}

function touchConversation(conversationId: string, message: Message) {
  const conversation = conversations.get(conversationId);
  if (!conversation) return;
  conversations.set(conversationId, {
    ...conversation,
    updatedAt: message.createdAt,
    lastMessage: {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      preview: previewOf(message),
      kind: message.kind,
      createdAt: message.createdAt,
    },
  });
}

function previewOf(message: Message): string {
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'file') return `📎 ${message.attachments?.[0]?.name ?? 'Fichier'}`;
  return message.text ?? '';
}

export const mockApi = {
  async listConversations({ cursor, limit = 30 }: { cursor?: string | null; limit?: number }): Promise<
    Paginated<Conversation>
  > {
    seed();
    await maybeFail();
    const sorted = [...conversations.values()].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
    const start = cursor ? sorted.findIndex((c) => c.id === cursor) + 1 : 0;
    const items = sorted.slice(start, start + limit);
    const hasMore = start + limit < sorted.length;
    return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null, hasMore };
  },

  async getConversation(id: string): Promise<Conversation> {
    seed();
    await maybeFail();
    const conversation = conversations.get(id);
    if (!conversation) throw new ApiError('notFound', 'Conversation introuvable.');
    return conversation;
  },

  async openDirect(userId: string): Promise<Conversation> {
    seed();
    await maybeFail();
    const existing = [...conversations.values()].find(
      (conversation) => conversation.type === 'direct' && conversation.peer?.id === userId
    );
    if (existing) return existing;

    const peer = getDirectoryUser(userId) ?? { id: userId, fullName: 'Membre ADU' };
    const conversation: Conversation = {
      id: `c_${userId}`,
      type: 'direct',
      title: peer.fullName,
      peer,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      lastMessage: null,
    };
    conversations.set(conversation.id, conversation);
    messagesByConversation.set(conversation.id, []);
    return conversation;
  },

  async markAsRead(id: string): Promise<void> {
    seed();
    await wait(80);
    const conversation = conversations.get(id);
    if (conversation) conversations.set(id, { ...conversation, unreadCount: 0 });
  },

  async listMessages({ conversationId, cursor, limit = 25, since }: ListMessagesParams): Promise<
    Paginated<Message>
  > {
    seed();
    await maybeFail();
    const all = [...(messagesByConversation.get(conversationId) ?? [])].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );

    if (since) {
      const sinceMs = Date.parse(since);
      const items = all.filter((message) => Date.parse(message.createdAt) > sinceMs);
      return { items, nextCursor: null, hasMore: false };
    }

    const endIndex = cursor ? all.findIndex((message) => message.id === cursor) : all.length;
    const safeEnd = endIndex < 0 ? all.length : endIndex;
    const start = Math.max(0, safeEnd - limit);
    const items = all.slice(start, safeEnd);
    const hasMore = start > 0;
    return { items, nextCursor: hasMore ? (items[0]?.id ?? null) : null, hasMore };
  },

  async sendMessage(payload: SendMessagePayload): Promise<Message> {
    seed();
    await maybeFail();
    const attachments: MessageAttachment[] | undefined = payload.attachmentIds?.length
      ? payload.attachmentIds.map((id) => uploadedAttachments.get(id)).filter(Boolean as never)
      : undefined;

    const message: Message = {
      id: createClientId('srv'),
      conversationId: payload.conversationId,
      senderId: ME,
      senderName: 'Moi',
      kind: payload.kind,
      text: payload.text,
      attachments,
      replyTo: payload.replyToId
        ? findReplyPreview(payload.conversationId, payload.replyToId)
        : null,
      createdAt: new Date().toISOString(),
      status: 'sent',
      clientId: payload.clientId,
    };

    const list = messagesByConversation.get(payload.conversationId) ?? [];
    list.push(message);
    messagesByConversation.set(payload.conversationId, list);
    touchConversation(payload.conversationId, message);
    return message;
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    seed();
    await maybeFail();
    const list = messagesByConversation.get(conversationId) ?? [];
    messagesByConversation.set(
      conversationId,
      list.map((message) =>
        message.id === messageId
          ? { ...message, deletedAt: new Date().toISOString(), text: undefined, attachments: undefined }
          : message
      )
    );
  },

  async upload(source: UploadSource, options: UploadOptions = {}): Promise<MessageAttachment> {
    // Progression simulée pour vérifier la barre et l'annulation.
    for (let step = 1; step <= 5; step += 1) {
      if (options.signal?.aborted) throw new ApiError('unknown', 'Envoi annulé.');
      await wait(120);
      options.onProgress?.(step / 5);
    }
    const attachment: MessageAttachment = {
      id: createClientId('att'),
      kind: source.mimeType.startsWith('image/') ? 'image' : 'file',
      url: source.uri,
      thumbnailUrl: source.mimeType.startsWith('image/') ? source.uri : null,
      name: source.name,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
    };
    uploadedAttachments.set(attachment.id, attachment);
    return attachment;
  },

  async createGroup(payload: CreateGroupPayload): Promise<Conversation> {
    seed();
    await maybeFail();
    const id = createClientId('grp');
    const members: GroupMember[] = [
      { id: ME, fullName: 'Moi', email: 'momo@adu.ne', role: 'admin' },
      ...payload.memberIds.map((memberId) => ({
        ...(getDirectoryUser(memberId) ?? { id: memberId, fullName: 'Membre ADU' }),
        role: 'member' as const,
      })),
    ];

    groups.set(id, {
      id,
      name: payload.name,
      description: payload.description ?? null,
      avatarUrl: null,
      membersCount: members.length,
      createdBy: ME,
      createdAt: new Date().toISOString(),
      myRole: 'admin',
    });
    groupMembers.set(id, members);

    const conversation: Conversation = {
      id,
      type: 'group',
      title: payload.name,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      lastMessage: null,
    };
    conversations.set(id, conversation);
    messagesByConversation.set(id, []);
    return conversation;
  },

  async getGroup(id: string): Promise<Group> {
    seed();
    await maybeFail();
    const group = groups.get(id);
    if (!group) throw new ApiError('notFound', 'Groupe introuvable.');
    return group;
  },

  async updateGroup(id: string, payload: UpdateGroupPayload): Promise<Group> {
    seed();
    await maybeFail();
    const group = groups.get(id);
    if (!group) throw new ApiError('notFound', 'Groupe introuvable.');
    const updated: Group = {
      ...group,
      name: payload.name ?? group.name,
      description: payload.description === undefined ? group.description : payload.description,
    };
    groups.set(id, updated);
    const conversation = conversations.get(id);
    if (conversation) conversations.set(id, { ...conversation, title: updated.name });
    return updated;
  },

  async listGroupMembers(id: string): Promise<GroupMember[]> {
    seed();
    await maybeFail();
    return groupMembers.get(id) ?? [];
  },

  async addGroupMembers(id: string, memberIds: string[]): Promise<GroupMember[]> {
    seed();
    await maybeFail();
    const current = groupMembers.get(id) ?? [];
    const added = memberIds
      .filter((memberId) => !current.some((member) => member.id === memberId))
      .map((memberId) => ({
        ...(getDirectoryUser(memberId) ?? { id: memberId, fullName: 'Membre ADU' }),
        role: 'member' as const,
      }));
    const next = [...current, ...added];
    groupMembers.set(id, next);
    const group = groups.get(id);
    if (group) groups.set(id, { ...group, membersCount: next.length });
    return next;
  },

  async removeGroupMember(id: string, userId: string): Promise<void> {
    seed();
    await maybeFail();
    const next = (groupMembers.get(id) ?? []).filter((member) => member.id !== userId);
    groupMembers.set(id, next);
    const group = groups.get(id);
    if (group) groups.set(id, { ...group, membersCount: next.length });
  },

  async leaveGroup(id: string): Promise<void> {
    seed();
    await maybeFail();
    groups.delete(id);
    groupMembers.delete(id);
    conversations.delete(id);
    messagesByConversation.delete(id);
  },

  async registerDevice(payload: RegisterDevicePayload): Promise<void> {
    await wait(120);
    devices.add(payload.token);
  },

  async unregisterDevice(token: string): Promise<void> {
    await wait(120);
    devices.delete(token);
  },

  async getNotificationPreferences(): Promise<NotificationPreferencesDto> {
    await wait(120);
    return preferences;
  },

  async updateNotificationPreferences(
    payload: Partial<NotificationPreferencesDto>
  ): Promise<NotificationPreferencesDto> {
    await wait(120);
    preferences = { ...preferences, ...payload };
    return preferences;
  },
};

const uploadedAttachments = new Map<string, MessageAttachment>();

function findReplyPreview(conversationId: string, messageId: string) {
  const origin = (messagesByConversation.get(conversationId) ?? []).find(
    (message) => message.id === messageId
  );
  if (!origin) return null;
  return {
    id: origin.id,
    senderId: origin.senderId,
    senderName: origin.senderName,
    preview: previewOf(origin),
    kind: origin.kind,
  };
}

/** Réservé aux tests : remet le back simulé à zéro. */
export function __resetMockApi() {
  conversations.clear();
  messagesByConversation.clear();
  groups.clear();
  groupMembers.clear();
  uploadedAttachments.clear();
  devices.clear();
  preferences = {
    enabled: true,
    directMessages: true,
    groupMessages: true,
    quietHoursStart: null,
    quietHoursEnd: null,
  };
}
