/* eslint-disable no-console */
const enabled = __DEV__;

export const logger = {
  debug(scope: string, ...args: unknown[]) {
    if (enabled) console.log(`[${scope}]`, ...args);
  },
  warn(scope: string, ...args: unknown[]) {
    if (enabled) console.warn(`[${scope}]`, ...args);
  },
  error(scope: string, ...args: unknown[]) {
    console.error(`[${scope}]`, ...args);
  },
};
