/** Liste des membres d'un groupe (ICH-047). */
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, ErrorState, LoadingState, Screen, Separator } from '@/components/ui';
import { getCurrentUserId } from '@/mocks';
import { selectGroupEntry, useGroupsStore } from '@/store/groupsStore';
import { colors, radius, spacing, typography } from '@/theme';

function MembersSeparator() {
  return <Separator inset={spacing.lg + 40 + spacing.md} />;
}

export function GroupMembersScreen() {
  const { conversationId } = useRoute().params;
  const navigation = useNavigation();

  const entry = useGroupsStore((state) => selectGroupEntry(state, conversationId));
  const load = useGroupsStore((state) => state.load);
  const removeMember = useGroupsStore((state) => state.removeMember);
  const currentUserId = getCurrentUserId();
  const isAdmin = !!entry.group && entry.group.myRole === 'admin';

  useEffect(() => {
    if (entry.status === 'idle') void load(conversationId);
  }, [conversationId, entry.status, load]);

  const confirmRemove = useCallback(
    (member) => {
      Alert.alert('Retirer du groupe', `Retirer ${member.fullName} du groupe ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => void removeMember(conversationId, member.id),
        },
      ]);
    },
    [conversationId, removeMember]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <Pressable
        onLongPress={
          isAdmin && item.id !== currentUserId ? () => confirmRemove(item) : undefined
        }
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={item.fullName}
      >
        <Avatar name={item.fullName} uri={item.avatarUrl} size={40} />
        <View style={styles.info}>
          <Text style={typography.body} numberOfLines={1}>
            {item.id === currentUserId ? 'Vous' : item.fullName}
          </Text>
          <Text style={typography.caption} numberOfLines={1}>
            {item.department || item.email || ''}
          </Text>
        </View>
        {item.role === 'admin' ? <Text style={styles.adminTag}>Admin</Text> : null}
      </Pressable>
    ),
    [confirmRemove, currentUserId, isAdmin]
  );

  if (entry.status === 'loading' && !entry.members.length) {
    return (
      <Screen>
        <LoadingState label="Chargement des membres…" />
      </Screen>
    );
  }

  if (entry.status === 'error' && !entry.members.length) {
    return (
      <Screen>
        <ErrorState
          message={entry.error || 'Membres indisponibles.'}
          onRetry={() => void load(conversationId)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={entry.members}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={MembersSeparator}
        ListHeaderComponent={
          isAdmin ? (
            <Pressable
              onPress={() => navigation.navigate('AddMembers', { conversationId })}
              style={styles.addRow}
              accessibilityRole="button"
            >
              <Text style={styles.addLabel}>＋ Ajouter des membres</Text>
            </Pressable>
          ) : null
        }
        ListFooterComponent={
          isAdmin ? (
            <Text style={styles.hint}>Appui long sur un membre pour le retirer du groupe.</Text>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  info: { flex: 1 },
  adminTag: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  addRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  addLabel: { ...typography.body, color: colors.primary, fontWeight: '600' },
  hint: { ...typography.caption, padding: spacing.lg },
});
