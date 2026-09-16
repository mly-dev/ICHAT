/**
 * Back-end simulé, actif tant que `apiConfig.useMocks` est vrai.
 *
 * Il existe pour deux raisons : le back d'Ibou n'est pas encore déployé, et on
 * a besoin de reproduire un réseau nigérien (latence) sans écrire de données en
 * dur dans les composants.
 */
import { getDirectoryUser } from '@/mocks';
import { createClientId } from '@/utils/ids';

import { ApiError } from './errors';

const ME = 'me';
/** Latence simulée : volontairement élevée, c'est le vrai terrain. */
const LATENCY_MS = 350;

function wait(ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const conversations = new Map();
const messagesByConversation = new Map();
const groups = new Map();
const groupMembers = new Map();
const uploadedAttachments = new Map();
const devices = new Set();

let preferences = {
  enabled: true,
  directMessages: true,
  groupMessages: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

function buildMessage(id, conversationId, senderId, text, minutesAgo) {
  const directoryUser = senderId === ME ? undefined : getDirectoryUser(senderId);
  return {
    id,
    conversationId,
    senderId,
    senderName: senderId === ME ? 'Moi' : directoryUser && directoryUser.fullName,
    kind: 'text',
    text,
    createdAt: isoMinutesAgo(minutesAgo),
    status: senderId === ME ? 'read' : 'delivered',
  };
}

function previewOf(message) {
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'file') {
    const first = message.attachments && message.attachments[0];
    return `📎 ${(first && first.name) || 'Fichier'}`;
  }
  return message.text || '';
}

function seed() {
  if (conversations.size) return;

  [
    {
      id: 'c1',
      type: 'direct',
      title: 'Aïcha Abdou',
      peer: getDirectoryUser('u1') || null,
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
      peer: getDirectoryUser('u6') || null,
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
  ].forEach((conversation) => conversations.set(conversation.id, conversation));

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
    { ...getDirectoryUser('u4'), role: 'admin' },
    { ...getDirectoryUser('u2'), role: 'member' },
    { ...getDirectoryUser('u5'), role: 'member' },
    { id: ME, fullName: 'Moi', email: 'momo@adu.ne', role: 'member' },
  ]);
}

function touchConversation(conversationId, message) {
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

function findReplyPreview(conversationId, messageId) {
  const origin = (messagesByConversation.get(conversationId) || []).find(
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

export const mockApi = {
  async listConversations({ cursor, limit = 30 } = {}) {
    seed();
    await wait();
    const sorted = [...conversations.values()].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
    const start = cursor ? sorted.findIndex((item) => item.id === cursor) + 1 : 0;
    const items = sorted.slice(start, start + limit);
    const hasMore = start + limit < sorted.length;
    const last = items[items.length - 1];
    return { items, nextCursor: hasMore && last ? last.id : null, hasMore };
  },

  async getConversation(id) {
    seed();
    await wait();
    const conversation = conversations.get(id);
    if (!conversation) throw new ApiError('notFound', 'Conversation introuvable.');
    return conversation;
  },

  async openDirect(userId) {
    seed();
    await wait();
    const existing = [...conversations.values()].find(
      (conversation) => conversation.type === 'direct' && conversation.peer && conversation.peer.id === userId
    );
    if (existing) return existing;

    const peer = getDirectoryUser(userId) || { id: userId, fullName: 'Membre ADU' };
    const conversation = {
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

  async markAsRead(id) {
    seed();
    await wait(80);
    const conversation = conversations.get(id);
    if (conversation) conversations.set(id, { ...conversation, unreadCount: 0 });
  },

  async listMessages({ conversationId, cursor, limit = 25, since }) {
    seed();
    await wait();
    const all = [...(messagesByConversation.get(conversationId) || [])].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );

    if (since) {
      const sinceMs = Date.parse(since);
      return {
        items: all.filter((message) => Date.parse(message.createdAt) > sinceMs),
        nextCursor: null,
        hasMore: false,
      };
    }

    const endIndex = cursor ? all.findIndex((message) => message.id === cursor) : all.length;
    const safeEnd = endIndex < 0 ? all.length : endIndex;
    const start = Math.max(0, safeEnd - limit);
    const items = all.slice(start, safeEnd);
    const hasMore = start > 0;
    return { items, nextCursor: hasMore && items[0] ? items[0].id : null, hasMore };
  },

  async sendMessage(payload) {
    seed();
    await wait();
    const attachments = (payload.attachmentIds || [])
      .map((id) => uploadedAttachments.get(id))
      .filter(Boolean);

    const message = {
      id: createClientId('srv'),
      conversationId: payload.conversationId,
      senderId: ME,
      senderName: 'Moi',
      kind: payload.kind,
      text: payload.text,
      attachments: attachments.length ? attachments : undefined,
      replyTo: payload.replyToId ? findReplyPreview(payload.conversationId, payload.replyToId) : null,
      createdAt: new Date().toISOString(),
      status: 'sent',
      clientId: payload.clientId,
    };

    const list = messagesByConversation.get(payload.conversationId) || [];
    list.push(message);
    messagesByConversation.set(payload.conversationId, list);
    touchConversation(payload.conversationId, message);
    return message;
  },

  async deleteMessage(conversationId, messageId) {
    seed();
    await wait();
    const list = messagesByConversation.get(conversationId) || [];
    messagesByConversation.set(
      conversationId,
      list.map((message) =>
        message.id === messageId
          ? { ...message, deletedAt: new Date().toISOString(), text: undefined, attachments: undefined }
          : message
      )
    );
  },

  async upload(source, options = {}) {
    // Progression simulée, pour vérifier la barre et l'annulation.
    for (let step = 1; step <= 5; step += 1) {
      if (options.signal && options.signal.aborted) {
        throw new ApiError('unknown', 'Envoi annulé.');
      }
      await wait(120);
      if (options.onProgress) options.onProgress(step / 5);
    }

    const attachment = {
      id: createClientId('att'),
      kind: source.mimeType && source.mimeType.startsWith('image/') ? 'image' : 'file',
      url: source.uri,
      thumbnailUrl: source.mimeType && source.mimeType.startsWith('image/') ? source.uri : null,
      name: source.name,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
    };
    uploadedAttachments.set(attachment.id, attachment);
    return attachment;
  },

  async createGroup(payload) {
    seed();
    await wait();
    const id = createClientId('grp');
    const members = [
      { id: ME, fullName: 'Moi', email: 'momo@adu.ne', role: 'admin' },
      ...payload.memberIds.map((memberId) => ({
        ...(getDirectoryUser(memberId) || { id: memberId, fullName: 'Membre ADU' }),
        role: 'member',
      })),
    ];

    groups.set(id, {
      id,
      name: payload.name,
      description: payload.description || null,
      avatarUrl: null,
      membersCount: members.length,
      createdBy: ME,
      createdAt: new Date().toISOString(),
      myRole: 'admin',
    });
    groupMembers.set(id, members);

    const conversation = {
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

  async getGroup(id) {
    seed();
    await wait();
    const group = groups.get(id);
    if (!group) throw new ApiError('notFound', 'Groupe introuvable.');
    return group;
  },

  async updateGroup(id, payload) {
    seed();
    await wait();
    const group = groups.get(id);
    if (!group) throw new ApiError('notFound', 'Groupe introuvable.');

    const updated = {
      ...group,
      name: payload.name || group.name,
      description: payload.description === undefined ? group.description : payload.description,
    };
    groups.set(id, updated);

    const conversation = conversations.get(id);
    if (conversation) conversations.set(id, { ...conversation, title: updated.name });
    return updated;
  },

  async listGroupMembers(id) {
    seed();
    await wait();
    return groupMembers.get(id) || [];
  },

  async addGroupMembers(id, memberIds) {
    seed();
    await wait();
    const current = groupMembers.get(id) || [];
    const added = memberIds
      .filter((memberId) => !current.some((member) => member.id === memberId))
      .map((memberId) => ({
        ...(getDirectoryUser(memberId) || { id: memberId, fullName: 'Membre ADU' }),
        role: 'member',
      }));

    const next = [...current, ...added];
    groupMembers.set(id, next);
    const group = groups.get(id);
    if (group) groups.set(id, { ...group, membersCount: next.length });
    return next;
  },

  async removeGroupMember(id, userId) {
    seed();
    await wait();
    const next = (groupMembers.get(id) || []).filter((member) => member.id !== userId);
    groupMembers.set(id, next);
    const group = groups.get(id);
    if (group) groups.set(id, { ...group, membersCount: next.length });
  },

  async leaveGroup(id) {
    seed();
    await wait();
    groups.delete(id);
    groupMembers.delete(id);
    conversations.delete(id);
    messagesByConversation.delete(id);
  },

  async registerDevice(payload) {
    await wait(120);
    devices.add(payload.token);
  },

  async unregisterDevice(token) {
    await wait(120);
    devices.delete(token);
  },

  async getNotificationPreferences() {
    await wait(120);
    return preferences;
  },

  async updateNotificationPreferences(payload) {
    await wait(120);
    preferences = { ...preferences, ...payload };
    return preferences;
  },
};

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
