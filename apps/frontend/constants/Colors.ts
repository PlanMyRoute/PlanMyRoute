export const Colors = {
  primary: '#FFD54D',
  dark: '#202020',
  neutral: '#999999',
  white: '#FFFFFF',
  error: '#EF4444',
} as const;

export type ColorKey = keyof typeof Colors;
