import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export const Separator = memo(function Separator({ inset = spacing.lg }) {
  return <View style={[styles.line, { marginLeft: inset }]} />;
});

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
