/**
 * Écran d'accueil : liste des conversations (ICH-013 à ICH-018).
 *
 * Liste virtualisée à hauteur de ligne fixe, pull-to-refresh, pagination, et
 * les quatre états attendus : chargement, vide, erreur, hors-ligne.
 */
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CONVERSATION_ROW_HEIGHT,
  ConversationRow,
} from '@/components/conversations/ConversationRow';
import { EmptyState, ErrorState, LoadingState, Screen, Separator } from '@/components/ui';
import { useConversations } from '@/hooks/useConversations';
import { getCurrentUserId } from '@/mocks';
import { colors, spacing, typography } from '@/theme';

function ListSeparator() {
  return <Separator inset={spacing.lg + 48 + spacing.md} />;
}

export function ConversationsScreen() {
  const navigation = useNavigation();
  const { items, status, error, refreshing, loadingMore, hasMore, refresh, loadMore, retry } =
    useConversations();
  const currentUserId = getCurrentUserId();

  /** ICH-017 : ouverture d'une conversation depuis la liste. */
  const openConversation = useCallback(
    (conversation) => {
      navigation.navigate('Chat', { conversationId: conversation.id, title: conversation.title });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ConversationRow
        conversation={item}
        currentUserId={currentUserId}
        onPress={openConversation}
      />
    ),
    [currentUserId, openConversation]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback(
    (_data, index) => ({
      length: CONVERSATION_ROW_HEIGHT,
      offset: CONVERSATION_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const onEndReached = useCallback(() => {
    if (hasMore && !loadingMore) void loadMore();
  }, [hasMore, loadingMore, loadMore]);

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState label="Chargement de vos discussions…" />
      </Screen>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <Screen>
        <ErrorState message={error || 'Impossible de charger vos discussions.'} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Discussions</Text>
        <Pressable
          onPress={() => navigation.navigate('CreateGroup')}
          accessibilityRole="button"
          accessibilityLabel="Créer un groupe"
          hitSlop={8}
        >
          <Text style={styles.newGroup}>Nouveau groupe</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ItemSeparatorComponent={ListSeparator}
        contentContainerStyle={items.length ? undefined : styles.emptyContainer}
        ListEmptyComponent={
          <EmptyState
            title="Aucune discussion"
            description="Trouvez un membre dans l'annuaire pour démarrer une conversation."
          />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />

      {status === 'error' && items.length > 0 ? (
        <Text style={styles.inlineError}>{error}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  newGroup: { ...typography.captionStrong, color: colors.primary, fontSize: 14 },
  emptyContainer: { flexGrow: 1 },
  footer: { paddingVertical: spacing.lg },
  inlineError: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
