import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { Message } from '@/types/models';
import { formatTime } from '@/utils/time';

import { MessageStatusIcon } from './MessageStatusIcon';

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  /** Affiche l'auteur : utile en groupe uniquement (ICH-050). */
  showSender: boolean;
  onLongPress?: (message: Message) => void;
  onRetry?: (message: Message) => void;
}

function MessageBubbleComponent({ message, isOwn, showSender, onLongPress, onRetry }: MessageBubbleProps) {
  const deleted = !!message.deletedAt;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <Pressable
        onLongPress={deleted ? undefined : () => onLongPress?.(message)}
        delayLongPress={300}
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        accessibilityRole="text"
      >
        {showSender && !isOwn ? (
          <Text style={styles.sender} numberOfLines={1}>
            {message.senderName ?? 'Membre ADU'}
          </Text>
        ) : null}

        {message.replyTo ? (
          <View style={[styles.quote, isOwn ? styles.quoteOwn : styles.quoteOther]}>
            <Text style={[styles.quoteAuthor, isOwn ? styles.textOwn : styles.textOther]} numberOfLines={1}>
              {message.replyTo.senderName ?? 'Message'}
            </Text>
            <Text style={[styles.quoteText, isOwn ? styles.textOwn : styles.textOther]} numberOfLines={2}>
              {message.replyTo.preview}
            </Text>
          </View>
        ) : null}

        {deleted ? (
          <Text style={[styles.deleted, isOwn ? styles.textOwn : styles.textOther]}>
            Message supprimé
          </Text>
        ) : message.text ? (
          <Text style={[typography.body, isOwn ? styles.textOwn : styles.textOther]}>{message.text}</Text>
        ) : null}

        <View style={styles.meta}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && !deleted ? <MessageStatusIcon status={message.status} /> : null}
        </View>
      </Pressable>

      {isOwn && message.status === 'failed' && onRetry ? (
        <Pressable onPress={() => onRetry(message)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.retry}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent, (prev, next) => {
  const a = prev.message;
  const b = next.message;
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.status === b.status &&
    a.deletedAt === b.deletedAt &&
    a.attachments === b.attachments &&
    prev.isOwn === next.isOwn &&
    prev.showSender === next.showSender
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, paddingVertical: 2, maxWidth: '100%' },
  rowOwn: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  bubbleOwn: { backgroundColor: colors.bubbleOwn, borderBottomRightRadius: radius.sm },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: radius.sm },
  sender: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
  textOwn: { color: colors.textInverse },
  textOther: { color: colors.text },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  quoteOwn: { borderLeftColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.12)' },
  quoteOther: { borderLeftColor: colors.primary, backgroundColor: 'rgba(11,95,255,0.06)' },
  quoteAuthor: { fontSize: 12, fontWeight: '700' },
  quoteText: { fontSize: 13, opacity: 0.9 },
  deleted: { ...typography.body, fontStyle: 'italic', opacity: 0.7 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  time: { fontSize: 11 },
  timeOwn: { color: 'rgba(255,255,255,0.75)' },
  timeOther: { color: colors.textMuted },
  retry: { ...typography.caption, color: colors.danger, fontWeight: '700', paddingTop: 2 },
});
