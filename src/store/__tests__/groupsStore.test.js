/** ICH-110 : groupes — création, membres, sortie. */
import { groupsApi } from '@/services/api';
import { useConversationsStore } from '@/store/conversationsStore';
import { selectGroupEntry, useGroupsStore } from '@/store/groupsStore';

jest.mock('@/services/api', () => ({
  groupsApi: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    listMembers: jest.fn(),
    addMembers: jest.fn(),
    removeMember: jest.fn(),
    leave: jest.fn(),
  },
  toUserMessage: (error) => (error instanceof Error ? error.message : 'erreur'),
}));

const group = {
  id: 'g1',
  name: 'Licence 3 Informatique',
  description: 'Promo L3',
  avatarUrl: null,
  membersCount: 2,
  createdBy: 'me',
  createdAt: '2026-01-01T08:00:00.000Z',
  myRole: 'admin',
};

const members = [
  { id: 'me', fullName: 'Moi', role: 'admin' },
  { id: 'u1', fullName: 'Aïcha Abdou', role: 'member' },
];

const conversation = {
  id: 'g1',
  type: 'group',
  title: group.name,
  unreadCount: 0,
  updatedAt: '2026-01-01T08:00:00.000Z',
  lastMessage: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useGroupsStore.getState().reset();
  useConversationsStore.getState().reset();
});

describe('groupes', () => {
  it('ajoute le groupe créé à la liste des conversations', async () => {
    groupsApi.create.mockResolvedValueOnce(conversation);

    const created = await useGroupsStore.getState().create({ name: group.name, memberIds: ['u1'] });

    expect(created.id).toBe('g1');
    expect(useConversationsStore.getState().items.map((item) => item.id)).toEqual(['g1']);
  });

  it('expose une erreur lisible si la création échoue', async () => {
    groupsApi.create.mockRejectedValueOnce(new Error('Le serveur est indisponible.'));

    const created = await useGroupsStore.getState().create({ name: 'X', memberIds: ['u1'] });

    expect(created).toBeNull();
    expect(useGroupsStore.getState().createError).toBe('Le serveur est indisponible.');
  });

  it('charge le groupe et ses membres', async () => {
    groupsApi.getById.mockResolvedValueOnce(group);
    groupsApi.listMembers.mockResolvedValueOnce(members);

    await useGroupsStore.getState().load('g1');

    const entry = selectGroupEntry(useGroupsStore.getState(), 'g1');
    expect(entry.status).toBe('ready');
    expect(entry.members).toHaveLength(2);
  });

  it('répercute le nouveau nom sur la liste des conversations', async () => {
    useConversationsStore.getState().upsert(conversation);
    groupsApi.update.mockResolvedValueOnce({ ...group, name: 'L3 Info 2026' });

    await useGroupsStore.getState().update('g1', { name: 'L3 Info 2026' });

    expect(useConversationsStore.getState().items[0].title).toBe('L3 Info 2026');
  });

  it('retire un membre tout de suite et revient en arrière si le serveur refuse', async () => {
    groupsApi.getById.mockResolvedValueOnce(group);
    groupsApi.listMembers.mockResolvedValueOnce(members);
    await useGroupsStore.getState().load('g1');

    groupsApi.removeMember.mockRejectedValueOnce(new Error('Accès refusé.'));
    await useGroupsStore.getState().removeMember('g1', 'u1');

    const entry = selectGroupEntry(useGroupsStore.getState(), 'g1');
    expect(entry.members.map((member) => member.id)).toEqual(['me', 'u1']);
    expect(entry.error).toBe('Accès refusé.');
  });

  it('efface la conversation quand on quitte le groupe', async () => {
    useConversationsStore.getState().upsert(conversation);
    groupsApi.leave.mockResolvedValueOnce(undefined);

    const ok = await useGroupsStore.getState().leave('g1');

    expect(ok).toBe(true);
    expect(useConversationsStore.getState().items).toHaveLength(0);
  });
});
