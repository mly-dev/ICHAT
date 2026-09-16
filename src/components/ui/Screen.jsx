import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import { OfflineBanner } from './OfflineBanner';

export const Screen = memo(function Screen({
  children,
  showOfflineBanner = true,
  style,
  edges = ['bottom'],
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {showOfflineBanner ? <OfflineBanner /> : null}
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
