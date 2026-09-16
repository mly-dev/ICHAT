/** Endpoints « messages » (ICH-020 à ICH-033). */
import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export const messagesApi = {
  /**
   * ICH-021/023 : page d'historique.
   * `since` sert à la resynchronisation après coupure : tout ce qui est
   * postérieur à cette date, sans repagination.
   */
  list(params) {
    if (apiConfig.useMocks) return mockApi.listMessages(params);
    return apiClient.get(endpoints.messages(params.conversationId), {
      query: { cursor: params.cursor, limit: params.limit || 25, since: params.since },
    });
  },

  /** ICH-020 : envoi. Un seul essai ici, la file d'envoi s'occupe du reste. */
  send(payload) {
    if (apiConfig.useMocks) return mockApi.sendMessage(payload);
    const { conversationId, ...body } = payload;
    return apiClient.post(endpoints.messages(conversationId), body, { retries: 0 });
  },

  /** ICH-028 : suppression d'un message. */
  remove(conversationId, messageId) {
    if (apiConfig.useMocks) return mockApi.deleteMessage(conversationId, messageId);
    return apiClient.delete(endpoints.message(conversationId, messageId));
  },
};
