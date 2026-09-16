const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Alias `@/…` vers `src/`, sans plugin Babel supplémentaire : Metro sait le
 * faire seul via extraNodeModules, et Jest via moduleNameMapper.
 */
const config = {
  resolver: {
    extraNodeModules: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
