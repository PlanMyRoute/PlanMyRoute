export const Colors = {
  primary: "#FFD54D",
  dark: "#202020",
  neutral: "#999999",
  white: "#FFFFFF",
  error: "#EF4444",
} as const;

/** Color para texto placeholder en inputs de texto */
export const PLACEHOLDER_TEXT_COLOR = "#9CA3AF";

export type ColorKey = keyof typeof Colors;
