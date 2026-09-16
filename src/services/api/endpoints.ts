/**
 * Toutes les routes au même endroit. Ces chemins sont une hypothèse tant
 * qu'Ibou n'a pas figé le contrat (docs/API-CONTRACT.md) : si ça change, on ne
 * touche qu'à ce fichier.
 */
export const endpoints = {
  conversations: '/conversations',
  conversation: (id: string) => `/conversations/${id}`,
  conversationRead: (id: string) => `/conversations/${id}/read`,
  directConversation: '/conversations/direct',

  messages: (conversationId: string) => `/conversations/${conversationId}/messages`,
  message: (conversationId: string, messageId: string) =>
    `/conversations/${conversationId}/messages/${messageId}`,

  uploads: '/uploads',

  groups: '/groups',
  group: (id: string) => `/groups/${id}`,
  groupMembers: (id: string) => `/groups/${id}/members`,
  groupMember: (id: string, userId: string) => `/groups/${id}/members/${userId}`,
  groupLeave: (id: string) => `/groups/${id}/leave`,

  devices: '/notifications/devices',
  device: (token: string) => `/notifications/devices/${encodeURIComponent(token)}`,
  notificationPreferences: '/notifications/preferences',
} as const;
