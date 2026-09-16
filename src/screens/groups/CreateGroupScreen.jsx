/** Création d'un groupe (ICH-044). */
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { MemberPicker } from '@/components/groups/MemberPicker';
import { Button, Screen } from '@/components/ui';
import { useGroupsStore } from '@/store/groupsStore';
import { colors, radius, spacing, typography } from '@/theme';

export function CreateGroupScreen() {
  const navigation = useNavigation();
  const create = useGroupsStore((state) => state.create);
  const creating = useGroupsStore((state) => state.creating);
  const createError = useGroupsStore((state) => state.createError);

  const [name, setName] = useState('');
  const [members, setMembers] = useState([]);

  const toggleMember = useCallback((user) => {
    setMembers((current) =>
      current.some((member) => member.id === user.id)
        ? current.filter((member) => member.id !== user.id)
        : [...current, user]
    );
  }, []);

  const submit = useCallback(async () => {
    const conversation = await create({
      name: name.trim(),
      memberIds: members.map((member) => member.id),
    });
    if (!conversation) return;

    // On remplace l'écran de création : revenir en arrière depuis le groupe doit
    // ramener à la liste, pas au formulaire.
    navigation.replace('Chat', { conversationId: conversation.id, title: conversation.title });
  }, [create, members, name, navigation]);

  const canSubmit = name.trim().length >= 2 && members.length > 0 && !creating;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          <Text style={typography.captionStrong}>Nom du groupe</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex. Licence 3 Informatique"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
            accessibilityLabel="Nom du groupe"
          />
          <Text style={typography.caption}>
            {members.length === 0
              ? 'Sélectionnez au moins un membre'
              : `${members.length} membre${members.length > 1 ? 's' : ''} sélectionné${
                  members.length > 1 ? 's' : ''
                }`}
          </Text>
        </View>

        <MemberPicker selectedIds={members.map((member) => member.id)} onToggle={toggleMember} />

        {createError ? <Text style={styles.error}>{createError}</Text> : null}

        <View style={styles.footer}>
          <Button
            label="Créer le groupe"
            onPress={submit}
            disabled={!canSubmit}
            loading={creating}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  input: {
    ...typography.body,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  error: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
