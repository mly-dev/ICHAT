/** Palette ilimiChat, alignée sur la maquette Figma « E-CHAT ». */
export const colors = {
  primary: '#0B5FFF',
  primaryDark: '#0A4BCC',
  primarySoft: '#E7EFFF',
  background: '#FFFFFF',
  surface: '#F5F7FA',
  surfaceAlt: '#EDF1F6',
  border: '#E1E6ED',
  text: '#101828',
  textMuted: '#667085',
  textInverse: '#FFFFFF',
  success: '#12B76A',
  warning: '#F79009',
  danger: '#D92D20',
  bubbleOwn: '#0B5FFF',
  bubbleOther: '#F0F2F5',
  overlay: 'rgba(0,0,0,0.85)',
} as const;

export type ColorName = keyof typeof colors;
