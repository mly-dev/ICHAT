const enabled = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export const logger = {
  debug(scope, ...args) {
    if (enabled) console.log(`[${scope}]`, ...args);
  },
  warn(scope, ...args) {
    if (enabled) console.warn(`[${scope}]`, ...args);
  },
  error(scope, ...args) {
    console.error(`[${scope}]`, ...args);
  },
};
