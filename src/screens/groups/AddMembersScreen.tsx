/** Ajout de membres à un groupe existant (ICH-045). */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MemberPicker } from '@/components/groups/MemberPicker';
import { Button, Screen } from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { selectGroupEntry, useGroupsStore } from '@/store/groupsStore';
import { colors, spacing, typography } from '@/theme';
import type { UserSummary } from '@/types/models';

type AddMembersRoute = RouteProp<RootStackParamList, 'AddMembers'>;

export function AddMembersScreen() {
  const { conversationId } = useRoute<AddMembersRoute>().params;
  const navigation = useNavigation();

  const entry = useGroupsStore((state) => selectGroupEntry(state, conversationId));
  const load = useGroupsStore((state) => state.load);
  const addMembers = useGroupsStore((state) => state.addMembers);

  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry.status === 'idle') void load(conversationId);
  }, [conversationId, entry.status, load]);

  const toggle = useCallback((user: UserSummary) => {
    setSelected((current) =>
      current.some((member) => member.id === user.id)
        ? current.filter((member) => member.id !== user.id)
        : [...current, user]
    );
  }, []);

  const submit = useCallback(async () => {
    setSaving(true);
    const ok = await addMembers(conversationId, selected.map((member) => member.id));
    setSaving(false);
    if (ok) navigation.goBack();
  }, [addMembers, conversationId, navigation, selected]);

  return (
    <Screen>
      <MemberPicker
        selectedIds={selected.map((member) => member.id)}
        onToggle={toggle}
        excludedIds={entry.members.map((member) => member.id)}
      />

      {entry.error ? <Text style={styles.error}>{entry.error}</Text> : null}

      <View style={styles.footer}>
        <Button
          label={selected.length ? `Ajouter ${selected.length} membre${selected.length > 1 ? 's' : ''}` : 'Ajouter'}
          onPress={submit}
          disabled={!selected.length || saving}
          loading={saving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
