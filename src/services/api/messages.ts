/** Endpoints « messages » (ICH-020 à ICH-033). */
import type {
  ConversationId,
  Message,
  MessageId,
  MessageKind,
  Paginated,
} from '@/types/models';

import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export interface ListMessagesParams {
  conversationId: ConversationId;
  /** Curseur vers les messages plus anciens (scroll inverse, ICH-023). */
  cursor?: string | null;
  limit?: number;
  /** Resynchronisation après coupure : tout ce qui est postérieur à cette date. */
  since?: string | null;
}

export interface SendMessagePayload {
  conversationId: ConversationId;
  kind: MessageKind;
  text?: string;
  /** Pièces jointes déjà téléversées (voir `uploadsApi`). */
  attachmentIds?: string[];
  replyToId?: MessageId | null;
  /** Identifiant local : le back le renvoie tel quel pour la réconciliation. */
  clientId: string;
}

export const messagesApi = {
  /** ICH-021/023 : page d'historique, du plus récent au plus ancien. */
  async list(params: ListMessagesParams): Promise<Paginated<Message>> {
    if (apiConfig.useMocks) return mockApi.listMessages(params);
    return apiClient.get<Paginated<Message>>(endpoints.messages(params.conversationId), {
      query: {
        cursor: params.cursor ?? undefined,
        limit: params.limit ?? 25,
        since: params.since ?? undefined,
      },
    });
  },

  /** ICH-020 : envoi. Un seul réessai réseau ici, la file s'occupe du reste. */
  async send(payload: SendMessagePayload): Promise<Message> {
    if (apiConfig.useMocks) return mockApi.sendMessage(payload);
    const { conversationId, ...body } = payload;
    return apiClient.post<Message>(endpoints.messages(conversationId), body, { retries: 0 });
  },

  /** ICH-028 : suppression d'un message. */
  async remove(conversationId: ConversationId, messageId: MessageId): Promise<void> {
    if (apiConfig.useMocks) return mockApi.deleteMessage(conversationId, messageId);
    await apiClient.delete<void>(endpoints.message(conversationId, messageId));
  },
};
