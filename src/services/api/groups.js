/** Endpoints « groupes » (ICH-044 à ICH-051). */
import { apiClient } from './client';
import { apiConfig } from './config';
import { endpoints } from './endpoints';
import { mockApi } from './mock';

export const groupsApi = {
  /** ICH-044 */
  create(payload) {
    if (apiConfig.useMocks) return mockApi.createGroup(payload);
    return apiClient.post(endpoints.groups, payload);
  },

  getById(id) {
    if (apiConfig.useMocks) return mockApi.getGroup(id);
    return apiClient.get(endpoints.group(id));
  },

  /** ICH-046 */
  update(id, payload) {
    if (apiConfig.useMocks) return mockApi.updateGroup(id, payload);
    return apiClient.patch(endpoints.group(id), payload);
  },

  /** ICH-047 */
  listMembers(id) {
    if (apiConfig.useMocks) return mockApi.listGroupMembers(id);
    return apiClient.get(endpoints.groupMembers(id));
  },

  /** ICH-045 */
  addMembers(id, memberIds) {
    if (apiConfig.useMocks) return mockApi.addGroupMembers(id, memberIds);
    return apiClient.post(endpoints.groupMembers(id), { memberIds });
  },

  removeMember(id, userId) {
    if (apiConfig.useMocks) return mockApi.removeGroupMember(id, userId);
    return apiClient.delete(endpoints.groupMember(id, userId));
  },

  /** ICH-051 */
  leave(id) {
    if (apiConfig.useMocks) return mockApi.leaveGroup(id);
    return apiClient.post(endpoints.groupLeave(id));
  },
};
