import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { formatDaySeparator } from '@/utils/time';

export const DaySeparator = memo(function DaySeparator({ date }) {
  return (
    <View style={styles.container}>
      <Text style={[typography.caption, styles.label]}>{formatDaySeparator(date)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.sm },
  label: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
