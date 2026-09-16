/**
 * Sélecteur de membres (ICH-045).
 *
 * La source de données est l'annuaire ADU, qui appartient à Adam (ICH-040).
 * Tant que son écran n'existe pas, on lit le mock `searchDirectory` : ce
 * composant ne connaît qu'une fonction de recherche, donc le jour où Adam
 * livre, on change l'import et rien d'autre.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, EmptyState, LoadingState } from '@/components/ui';
import { searchDirectory } from '@/mocks';
import { colors, radius, spacing, typography } from '@/theme';

export const MemberPicker = memo(function MemberPicker({
  selectedIds,
  onToggle,
  excludedIds = [],
}) {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Anti-rebond : sur un réseau lent, une requête par frappe est intenable.
    const timer = setTimeout(async () => {
      try {
        const results = await searchDirectory(query);
        if (!cancelled) setPeople(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const renderItem = useCallback(
    ({ item }) => {
      const isExcluded = excluded.has(item.id);
      const isSelected = selected.has(item.id);

      return (
        <Pressable
          onPress={() => !isExcluded && onToggle(item)}
          disabled={isExcluded}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected, disabled: isExcluded }}
          style={({ pressed }) => [styles.row, pressed && !isExcluded ? styles.pressed : null]}
        >
          <Avatar name={item.fullName} uri={item.avatarUrl} size={40} />
          <View style={styles.info}>
            <Text style={[typography.body, isExcluded ? styles.muted : null]} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={typography.caption} numberOfLines={1}>
              {isExcluded ? 'Déjà membre' : item.department || item.email || ''}
            </Text>
          </View>
          <View style={[styles.checkbox, isSelected ? styles.checkboxOn : null]}>
            {isSelected ? <Text style={styles.check}>✓</Text> : null}
          </View>
        </Pressable>
      );
    },
    [excluded, onToggle, selected]
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un membre ADU"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        accessibilityLabel="Rechercher un membre"
      />

      {loading && !people.length ? (
        <LoadingState label="Recherche…" />
      ) : (
        <FlatList
          data={people}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={7}
          ListEmptyComponent={
            <EmptyState
              title="Aucun résultat"
              description="Essayez un autre nom ou une autre faculté."
            />
          }
          contentContainerStyle={people.length ? undefined : styles.empty}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    ...typography.body,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.surface },
  info: { flex: 1 },
  muted: { color: colors.textMuted },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
  empty: { flexGrow: 1 },
});
