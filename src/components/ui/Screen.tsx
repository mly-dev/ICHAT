import React, { memo, ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import { OfflineBanner } from './OfflineBanner';

interface ScreenProps {
  children: ReactNode;
  /** Le bandeau hors-ligne est utile partout sauf en plein écran média. */
  showOfflineBanner?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const Screen = memo(function Screen({
  children,
  showOfflineBanner = true,
  style,
  edges = ['bottom'],
}: ScreenProps) {
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
