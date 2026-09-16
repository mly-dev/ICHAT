/** Endpoints « groupes » (ICH-044 à ICH-051). */
import type { Conversation, Group, GroupMember, UserId } from '@/types/models';

import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export interface CreateGroupPayload {
  name: string;
  description?: string;
  memberIds: UserId[];
  /** Identifiant d'une image déjà téléversée. */
  avatarAttachmentId?: string | null;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string | null;
  avatarAttachmentId?: string | null;
}

export const groupsApi = {
  /** ICH-044 */
  async create(payload: CreateGroupPayload): Promise<Conversation> {
    if (apiConfig.useMocks) return mockApi.createGroup(payload);
    return apiClient.post<Conversation>(endpoints.groups, payload);
  },

  async getById(id: string): Promise<Group> {
    if (apiConfig.useMocks) return mockApi.getGroup(id);
    return apiClient.get<Group>(endpoints.group(id));
  },

  /** ICH-046 */
  async update(id: string, payload: UpdateGroupPayload): Promise<Group> {
    if (apiConfig.useMocks) return mockApi.updateGroup(id, payload);
    return apiClient.patch<Group>(endpoints.group(id), payload);
  },

  /** ICH-047 */
  async listMembers(id: string): Promise<GroupMember[]> {
    if (apiConfig.useMocks) return mockApi.listGroupMembers(id);
    return apiClient.get<GroupMember[]>(endpoints.groupMembers(id));
  },

  /** ICH-045 */
  async addMembers(id: string, memberIds: UserId[]): Promise<GroupMember[]> {
    if (apiConfig.useMocks) return mockApi.addGroupMembers(id, memberIds);
    return apiClient.post<GroupMember[]>(endpoints.groupMembers(id), { memberIds });
  },

  async removeMember(id: string, userId: UserId): Promise<void> {
    if (apiConfig.useMocks) return mockApi.removeGroupMember(id, userId);
    await apiClient.delete<void>(endpoints.groupMember(id, userId));
  },

  /** ICH-051 */
  async leave(id: string): Promise<void> {
    if (apiConfig.useMocks) return mockApi.leaveGroup(id);
    await apiClient.post<void>(endpoints.groupLeave(id));
  },
};
