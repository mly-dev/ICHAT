/** Endpoints « conversations » (ICH-013 à ICH-019). */
import type { Conversation, ConversationId, Paginated, UserId } from '@/types/models';

import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export interface ListConversationsParams {
  cursor?: string | null;
  limit?: number;
}

export const conversationsApi = {
  /** ICH-013/016 : liste triée par activité récente, paginée. */
  async list(params: ListConversationsParams = {}): Promise<Paginated<Conversation>> {
    if (apiConfig.useMocks) return mockApi.listConversations(params);
    return apiClient.get<Paginated<Conversation>>(endpoints.conversations, {
      query: { cursor: params.cursor ?? undefined, limit: params.limit ?? 30 },
    });
  },

  async getById(id: ConversationId): Promise<Conversation> {
    if (apiConfig.useMocks) return mockApi.getConversation(id);
    return apiClient.get<Conversation>(endpoints.conversation(id));
  },

  /** ICH-019 : ouvre (ou crée) la conversation privée avec un membre. */
  async openDirect(userId: UserId): Promise<Conversation> {
    if (apiConfig.useMocks) return mockApi.openDirect(userId);
    return apiClient.post<Conversation>(endpoints.directConversation, { userId });
  },

  /** ICH-026 : marque la conversation comme lue jusqu'au message donné. */
  async markAsRead(id: ConversationId, lastMessageId?: string): Promise<void> {
    if (apiConfig.useMocks) return mockApi.markAsRead(id);
    await apiClient.post<void>(endpoints.conversationRead(id), { lastMessageId });
  },
};
