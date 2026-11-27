import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, font, radius, space } from "../theme";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "text";
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === "primary";
  const isText = variant === "text";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        isText && styles.buttonText,
        disabled && styles.buttonDisabled,
        pressed && !disabled && { opacity: 0.85 },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          disabled
            ? { color: colors.muted }
            : isPrimary
              ? { color: colors.surface }
              : { color: isText ? colors.accent : colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <View style={[styles.card, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

export function Chip({ label, tone }: { label: string; tone: { fg: string; bg: string } }) {
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.chipLabel, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

/** A premium, quiet disclosure: no animation, clear state for assistive tech. */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  tone,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.disclosureHeader, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.disclosureTitle, tone ? { color: tone } : null]}>{title}</Text>
        <Text style={styles.disclosureIcon}>{open ? "–" : "+"}</Text>
      </Pressable>
      {open ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={[styles.sectionLabel]}>{children}</Text>;
}

export function Paragraph({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text style={[font.body, style as any]}>{children}</Text>;
}

export function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: space.xs }}>
      {items.map((item, i) => (
        <View key={`${i}-${item.slice(0, 12)}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function LabeledText({ label, value }: { label: string; value: string }) {
  if (!value || value.trim().length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.sublabel}>{label}</Text>
      <Text style={font.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  buttonText: { minHeight: 44, paddingHorizontal: space.sm },
  buttonDisabled: { backgroundColor: colors.line, borderColor: colors.line },
  buttonLabel: { fontSize: 16, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  chip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  disclosure: { borderTopWidth: 1, borderTopColor: colors.line },
  disclosureHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
  },
  disclosureTitle: { ...font.title, fontSize: 16, lineHeight: 22, flex: 1, paddingRight: space.sm },
  disclosureIcon: { fontSize: 20, color: colors.muted, width: 20, textAlign: "center" },
  disclosureBody: { paddingBottom: space.md, gap: space.md },
  sectionLabel: { ...font.label, color: colors.muted, marginTop: space.sm },
  sublabel: { ...font.label, color: colors.muted },
  bulletRow: { flexDirection: "row", gap: space.sm, paddingRight: space.sm },
  bulletDot: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  bulletText: { ...font.body, flex: 1 },
});
