export const CC = {
  surface: "#f2f9ea",
  surfaceLow: "#ebf3e3",
  surfaceContainer: "#e2ebda",
  surfaceHigh: "#dce6d4",
  surfaceHighest: "#d6e0cd",

  primary: "#176a21",
  primaryDim: "#025d16",
  primaryContainer: "#9df197",
  primaryFixedDim: "#90e28a",
  onPrimary: "#d1ffc8",
  onPrimaryContainer: "#005c15",

  secondary: "#775346",
  secondaryDim: "#6a473b",
  secondaryContainer: "#f7c7b7",
  onSecondary: "#ffefeb",

  tertiary: "#b60051",
  tertiaryContainer: "#ff8fa9",

  error: "#b02500",
  errorContainer: "#f95630",

  onSurface: "#2a3127",
  onSurfaceVariant: "#575e52",
  outline: "#72796d",
  outlineVariant: "#a8afa2",
} as const;

export const CIAO_PLAYER_COLORS = [
  { fill: "#176a21", label: "Green", meeple: CC.primaryFixedDim },
  { fill: "#b60051", label: "Pink", meeple: "#b60051" },
  { fill: "#2196f3", label: "Blue", meeple: "#2196f3" },
  { fill: "#f5a623", label: "Yellow", meeple: "#f5a623" },
] as const;

export const FONT_HEADLINE = `'Plus Jakarta Sans', 'Hiragino Sans', 'Noto Sans JP', sans-serif`;
export const FONT_BODY = `'Be Vietnam Pro', 'Hiragino Sans', 'Noto Sans JP', sans-serif`;

