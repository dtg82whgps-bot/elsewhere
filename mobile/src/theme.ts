import { Platform } from "react-native";

/** Elsewhere's visual language: warm paper, deep teal ink, one warm accent. */
export const colors = {
  paper: "#F7F5F0",
  surface: "#FFFFFF",
  ink: "#1C1B19",
  inkSoft: "#4A4740",
  muted: "#6B6760",
  line: "#E4E0D6",
  accent: "#2F5D62",
  accentSoft: "#E6EEEE",
  warm: "#B07A3A",
  warmSoft: "#F5EBDD",
  positive: "#2F6B4F",
  positiveSoft: "#E3F0E9",
  negative: "#8A3B3B",
  negativeSoft: "#F4E3E3",
  mixed: "#6A5A8C",
  mixedSoft: "#ECE8F4",
  danger: "#9B2C2C",
} as const;

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 20 } as const;

export const font = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "600" as const, letterSpacing: -0.4, color: colors.ink },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const, color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.inkSoft },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.6, textTransform: "uppercase" as const },
};

export const serif = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });

export const maxContentWidth = 680;
