/**
 * Store des groupes (ICH-044 à ICH-051).
 * Les messages de groupe passent par messagesStore : un groupe est une
 * conversation comme une autre, seule la gestion des membres est spécifique.
 */
import { groupsApi, toUserMessage } from '@/services/api';
import { logger } from '@/utils/logger';

import { useConversationsStore } from './conversationsStore';
import { createStore } from './createStore';
import { useMessagesStore } from './messagesStore';

const EMPTY_ENTRY = { group: null, members: [], status: 'idle', error: null };

export const useGroupsStore = createStore((set, get) => {
  function patch(conversationId, changes) {
    const { entries } = get();
    set({
      entries: {
        ...entries,
        [conversationId]: { ...(entries[conversationId] || EMPTY_ENTRY), ...changes },
      },
    });
  }

  return {
    entries: {},
    creating: false,
    createError: null,

    async load(conversationId) {
      patch(conversationId, { status: 'loading', error: null });
      try {
        // Deux appels distincts côté back ; on les lance ensemble, c'est le seul
        // endroit où le parallélisme fait gagner un aller-retour visible.
        const [group, members] = await Promise.all([
          groupsApi.getById(conversationId),
          groupsApi.listMembers(conversationId),
        ]);
        patch(conversationId, { group, members, status: 'ready', error: null });
      } catch (error) {
        logger.warn('groups', 'load', error);
        patch(conversationId, { status: 'error', error: toUserMessage(error) });
      }
    },

    /** ICH-044 */
    async create(payload) {
      set({ creating: true, createError: null });
      try {
        const conversation = await groupsApi.create(payload);
        useConversationsStore.getState().upsert(conversation);
        return conversation;
      } catch (error) {
        logger.warn('groups', 'create', error);
        set({ createError: toUserMessage(error) });
        return null;
      } finally {
        set({ creating: false });
      }
    },

    /** ICH-046 */
    async update(conversationId, payload) {
      try {
        const group = await groupsApi.update(conversationId, payload);
        patch(conversationId, { group, error: null });

        // Le titre affiché dans la liste doit suivre immédiatement.
        const conversation = useConversationsStore
          .getState()
          .items.find((item) => item.id === conversationId);
        if (conversation) {
          useConversationsStore.getState().upsert({ ...conversation, title: group.name });
        }
        return true;
      } catch (error) {
        logger.warn('groups', 'update', error);
        patch(conversationId, { error: toUserMessage(error) });
        return false;
      }
    },

    /** ICH-045 */
    async addMembers(conversationId, memberIds) {
      if (!memberIds.length) return true;
      try {
        const members = await groupsApi.addMembers(conversationId, memberIds);
        const entry = get().entries[conversationId] || EMPTY_ENTRY;
        patch(conversationId, {
          members,
          error: null,
          group: entry.group ? { ...entry.group, membersCount: members.length } : entry.group,
        });
        return true;
      } catch (error) {
        logger.warn('groups', 'addMembers', error);
        patch(conversationId, { error: toUserMessage(error) });
        return false;
      }
    },

    async removeMember(conversationId, userId) {
      const entry = get().entries[conversationId] || EMPTY_ENTRY;
      const previous = entry.members;
      // Retrait optimiste : la liste doit répondre au doigt, même en 2G.
      patch(conversationId, { members: previous.filter((member) => member.id !== userId) });

      try {
        await groupsApi.removeMember(conversationId, userId);
        return true;
      } catch (error) {
        logger.warn('groups', 'removeMember', error);
        patch(conversationId, { members: previous, error: toUserMessage(error) });
        return false;
      }
    },

    /** ICH-051 */
    async leave(conversationId) {
      try {
        await groupsApi.leave(conversationId);
        useConversationsStore.getState().remove(conversationId);

        const { threads } = useMessagesStore.getState();
        const nextThreads = { ...threads };
        delete nextThreads[conversationId];
        useMessagesStore.setState({ threads: nextThreads });

        const entries = { ...get().entries };
        delete entries[conversationId];
        set({ entries });
        return true;
      } catch (error) {
        logger.warn('groups', 'leave', error);
        patch(conversationId, { error: toUserMessage(error) });
        return false;
      }
    },

    reset() {
      set({ entries: {}, creating: false, createError: null });
    },
  };
});

export function selectGroupEntry(state, conversationId) {
  return state.entries[conversationId] || EMPTY_ENTRY;
}
