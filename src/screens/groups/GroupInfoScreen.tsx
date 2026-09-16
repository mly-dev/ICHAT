/** Informations du groupe : nom, description, membres, quitter (ICH-046, ICH-051). */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { selectGroupEntry, useGroupsStore } from '@/store/groupsStore';
import { colors, radius, spacing, typography } from '@/theme';

type GroupInfoRoute = RouteProp<RootStackParamList, 'GroupInfo'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function GroupInfoScreen() {
  const { conversationId } = useRoute<GroupInfoRoute>().params;
  const navigation = useNavigation<Navigation>();

  const entry = useGroupsStore((state) => selectGroupEntry(state, conversationId));
  const load = useGroupsStore((state) => state.load);
  const update = useGroupsStore((state) => state.update);
  const leave = useGroupsStore((state) => state.leave);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry.status === 'idle') void load(conversationId);
  }, [conversationId, entry.status, load]);

  useEffect(() => {
    if (!entry.group) return;
    setName(entry.group.name);
    setDescription(entry.group.description ?? '');
  }, [entry.group]);

  const save = useCallback(async () => {
    setSaving(true);
    const ok = await update(conversationId, { name: name.trim(), description: description.trim() });
    setSaving(false);
    if (ok) setEditing(false);
  }, [conversationId, description, name, update]);

  const confirmLeave = useCallback(() => {
    Alert.alert('Quitter le groupe', 'Vous ne recevrez plus les messages de ce groupe.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          const ok = await leave(conversationId);
          // On retourne à la liste : le fil qu'on vient de quitter n'existe plus.
          if (ok) navigation.navigate('Main', { screen: 'ConversationsTab' });
        },
      },
    ]);
  }, [conversationId, leave, navigation]);

  if (entry.status === 'loading' && !entry.group) {
    return (
      <Screen>
        <LoadingState label="Chargement du groupe…" />
      </Screen>
    );
  }

  if (!entry.group) {
    return (
      <Screen>
        <ErrorState
          message={entry.error ?? 'Groupe indisponible.'}
          onRetry={() => void load(conversationId)}
        />
      </Screen>
    );
  }

  const group = entry.group;
  const isAdmin = group.myRole === 'admin';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={group.name} uri={group.avatarUrl} size={72} />
          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              maxLength={80}
              accessibilityLabel="Nom du groupe"
            />
          ) : (
            <Text style={typography.title}>{group.name}</Text>
          )}
          <Text style={typography.caption}>
            {group.membersCount} membre{group.membersCount > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={typography.captionStrong}>Description</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
              accessibilityLabel="Description du groupe"
            />
          ) : (
            <Text style={typography.bodyMuted}>{group.description || 'Aucune description'}</Text>
          )}
        </View>

        {isAdmin ? (
          editing ? (
            <View style={styles.actions}>
              <Button label="Enregistrer" onPress={save} loading={saving} disabled={name.trim().length < 2} />
              <Button label="Annuler" variant="ghost" onPress={() => setEditing(false)} />
            </View>
          ) : (
            <Button label="Modifier les informations" variant="secondary" onPress={() => setEditing(true)} />
          )
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('GroupMembers', { conversationId })}
          style={styles.link}
          accessibilityRole="button"
        >
          <Text style={styles.linkLabel}>Voir les membres</Text>
        </Pressable>

        {entry.error ? <Text style={styles.error}>{entry.error}</Text> : null}

        <Button label="Quitter le groupe" variant="danger" onPress={confirmLeave} style={styles.leave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.xs },
  input: {
    ...typography.body,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignSelf: 'stretch',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  actions: { gap: spacing.sm },
  link: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  linkLabel: { ...typography.body, color: colors.primary, fontWeight: '600' },
  error: { ...typography.caption, color: colors.danger },
  leave: { marginTop: spacing.md },
});
