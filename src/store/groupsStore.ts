/**
 * Store des groupes (ICH-044 à ICH-051).
 * Les messages de groupe passent par messagesStore : un groupe est une
 * conversation comme une autre, seule la gestion des membres est spécifique.
 */
import { create } from 'zustand';

import { groupsApi, toUserMessage, type CreateGroupPayload, type UpdateGroupPayload } from '@/services/api';
import type { Conversation, ConversationId, Group, GroupMember, UserId } from '@/types/models';
import { logger } from '@/utils/logger';

import { useConversationsStore } from './conversationsStore';
import { useMessagesStore } from './messagesStore';

interface GroupEntry {
  group: Group | null;
  members: GroupMember[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

const EMPTY_ENTRY: GroupEntry = { group: null, members: [], status: 'idle', error: null };

interface GroupsState {
  entries: Record<ConversationId, GroupEntry>;
  creating: boolean;
  createError: string | null;

  load: (conversationId: ConversationId) => Promise<void>;
  create: (payload: CreateGroupPayload) => Promise<Conversation | null>;
  update: (conversationId: ConversationId, payload: UpdateGroupPayload) => Promise<boolean>;
  addMembers: (conversationId: ConversationId, memberIds: UserId[]) => Promise<boolean>;
  removeMember: (conversationId: ConversationId, userId: UserId) => Promise<boolean>;
  leave: (conversationId: ConversationId) => Promise<boolean>;
  reset: () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => {
  function patch(conversationId: ConversationId, changes: Partial<GroupEntry>) {
    set((state) => ({
      entries: {
        ...state.entries,
        [conversationId]: { ...(state.entries[conversationId] ?? EMPTY_ENTRY), ...changes },
      },
    }));
  }

  return {
    entries: {},
    creating: false,
    createError: null,

    async load(conversationId) {
      patch(conversationId, { status: 'loading', error: null });
      try {
        // Deux appels distincts côté back ; on les lance ensemble, c'est le
        // seul endroit où le parallélisme fait gagner un aller-retour visible.
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
      const entry = get().entries[conversationId] ?? EMPTY_ENTRY;
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
        patch(conversationId, { group: entry.group, error: toUserMessage(error) });
        return false;
      }
    },

    /** ICH-045 */
    async addMembers(conversationId, memberIds) {
      if (!memberIds.length) return true;
      try {
        const members = await groupsApi.addMembers(conversationId, memberIds);
        const entry = get().entries[conversationId] ?? EMPTY_ENTRY;
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
      const entry = get().entries[conversationId] ?? EMPTY_ENTRY;
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
        useMessagesStore.setState((state) => {
          const threads = { ...state.threads };
          delete threads[conversationId];
          return { threads };
        });
        set((state) => {
          const entries = { ...state.entries };
          delete entries[conversationId];
          return { entries };
        });
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

export function selectGroupEntry(state: GroupsState, conversationId: ConversationId): GroupEntry {
  return state.entries[conversationId] ?? EMPTY_ENTRY;
}
