/** Endpoints « conversations » (ICH-013 à ICH-019). */
import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export const conversationsApi = {
  /** ICH-013/016 : liste triée par activité récente, paginée. */
  list(params = {}) {
    if (apiConfig.useMocks) return mockApi.listConversations(params);
    return apiClient.get(endpoints.conversations, {
      query: { cursor: params.cursor, limit: params.limit || 30 },
    });
  },

  getById(id) {
    if (apiConfig.useMocks) return mockApi.getConversation(id);
    return apiClient.get(endpoints.conversation(id));
  },

  /** ICH-019 : ouvre (ou crée) la conversation privée avec un membre. */
  openDirect(userId) {
    if (apiConfig.useMocks) return mockApi.openDirect(userId);
    return apiClient.post(endpoints.directConversation, { userId });
  },

  /** ICH-026 : marque la conversation comme lue jusqu'au message donné. */
  markAsRead(id, lastMessageId) {
    if (apiConfig.useMocks) return mockApi.markAsRead(id);
    return apiClient.post(endpoints.conversationRead(id), { lastMessageId });
  },
};
