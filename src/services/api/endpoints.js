/**
 * Toutes les routes au même endroit. Ces chemins sont une hypothèse tant
 * qu'Ibou n'a pas figé le contrat (docs/API-CONTRACT.md) : si ça change, on ne
 * touche qu'à ce fichier.
 */
export const endpoints = {
  conversations: '/conversations',
  conversation: (id) => `/conversations/${id}`,
  conversationRead: (id) => `/conversations/${id}/read`,
  directConversation: '/conversations/direct',

  messages: (conversationId) => `/conversations/${conversationId}/messages`,
  message: (conversationId, messageId) => `/conversations/${conversationId}/messages/${messageId}`,

  uploads: '/uploads',

  groups: '/groups',
  group: (id) => `/groups/${id}`,
  groupMembers: (id) => `/groups/${id}/members`,
  groupMember: (id, userId) => `/groups/${id}/members/${userId}`,
  groupLeave: (id) => `/groups/${id}/leave`,

  devices: '/notifications/devices',
  device: (token) => `/notifications/devices/${encodeURIComponent(token)}`,
  notificationPreferences: '/notifications/preferences',
};
