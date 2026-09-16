/** Configuration réseau lue depuis les variables d'environnement Expo. */
const DEFAULT_TIMEOUT = 20000;

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ilimichat.adu.ne',
  socketUrl:
    process.env.EXPO_PUBLIC_SOCKET_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    'https://api.ilimichat.adu.ne',
  timeout: readNumber(process.env.EXPO_PUBLIC_API_TIMEOUT, DEFAULT_TIMEOUT),
  /** Tant que le back d'Ibou n'est pas déployé, on sert des données simulées. */
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS === '1',
} as const;
