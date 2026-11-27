import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card } from "./ui";
import { colors, font, radius, serif, space } from "../theme";
import type { ModeId } from "../types";

/** The format choice: two visually distinct, selectable options. */
export function ModePicker({ onSelect }: { onSelect: (mode: ModeId) => void }) {
  return (
    <View style={{ gap: space.md }}>
      <Text style={styles.question} accessibilityRole="header">
        How would you like to explore this decision?
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Three possible futures. Explore three different ways your future could unfold."
        onPress={() => onSelect("futures")}
        style={({ pressed }) => [styles.modeCard, styles.modeFutures, pressed && { opacity: 0.9 }]}
      >
        <Text style={[styles.modeEyebrow, styles.onDarkMuted]}>Option 1</Text>
        <Text style={[styles.modeTitle, styles.onDark]}>Three possible futures</Text>
        <Text style={[styles.modeBody, styles.onDark]}>Explore three different ways your future could unfold: a positive path, a negative path, and a mixed one.</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pros and cons. Understand five potential advantages and five potential disadvantages."
        onPress={() => onSelect("prosCons")}
        style={({ pressed }) => [styles.modeCard, styles.modeProsCons, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.modeEyebrow}>Option 2</Text>
        <Text style={styles.modeTitle}>Pros & cons</Text>
        <Text style={styles.modeBody}>Understand five potential advantages and five potential disadvantages, each tied to your situation.</Text>
      </Pressable>
    </View>
  );
}

export function SwitchMode({ current, onSwitch }: { current: ModeId; onSwitch: (mode: ModeId) => void }) {
  return current === "futures" ? (
    <Button
      variant="secondary"
      label="See this decision as pros and cons instead"
      accessibilityHint="Uses the same decision, your details and the same research"
      onPress={() => onSwitch("prosCons")}
    />
  ) : (
    <Button
      variant="secondary"
      label="See this decision as three possible futures instead"
      accessibilityHint="Uses the same decision, your details and the same research"
      onPress={() => onSwitch("futures")}
    />
  );
}

const STARTERS = [
  "What if I had more money saved?",
  "What if I moved with a friend?",
  "What if I waited another year?",
  "Which factors matter most?",
  "How could I improve my chances of the best outcome?",
];

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function FollowUpPanel({
  turns,
  busy,
  error,
  onAsk,
}: {
  turns: ChatTurn[];
  busy: boolean;
  error: string | null;
  onAsk: (question: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    onAsk(q);
  };

  return (
    <Card>
      <Text style={styles.question} accessibilityRole="header">
        Ask about this analysis
      </Text>
      <Text style={styles.helper}>Your decision, your details and the research stay as the basis for every answer.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {STARTERS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={s}
            onPress={() => send(s)}
            disabled={busy}
            style={({ pressed }) => [styles.starter, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.starterText}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {turns.map((t, i) => (
        <View key={i} style={[styles.turn, t.role === "user" ? styles.turnUser : styles.turnAssistant]}>
          <Text style={styles.turnRole}>{t.role === "user" ? "You" : "Elsewhere"}</Text>
          <Text style={font.body}>{t.content}</Text>
        </View>
      ))}
      {busy ? <Text style={styles.helper}>Thinking it through…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask your own question"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Ask your own question"
          maxLength={500}
          multiline
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => send(draft)}
        />
        <Button
          label="Ask"
          onPress={() => send(draft)}
          disabled={busy || draft.trim().length < 3}
          style={{ minHeight: 48, paddingHorizontal: space.md }}
        />
      </View>
    </Card>
  );
}

export function ConsentModal({
  visible,
  onAccept,
  onDecline,
  privacyUrl,
  onOpenPrivacy,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  privacyUrl: string;
  onOpenPrivacy: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDecline} presentationStyle="pageSheet">
      <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.consent}>
        <Text style={styles.consentTitle} accessibilityRole="header">
          Before we analyze your decision
        </Text>
        <Text style={styles.consentBody}>
          To produce your analysis, Elsewhere sends the following to our analysis service, which uses an artificial intelligence model
          (Anthropic's Claude) and a web search tool:
        </Text>
        <View style={{ gap: space.sm }}>
          <Text style={styles.consentItem}>• The decision you typed.</Text>
          <Text style={styles.consentItem}>• Any personal details you chose to add on your profile screen.</Text>
          <Text style={styles.consentItem}>• Search queries the model writes to find current, relevant information.</Text>
        </View>
        <Text style={styles.consentBody}>
          We do not sell this information and we do not use it for advertising. The analysis service does not keep your decision or
          profile after your analysis is returned. Your profile stays on your device unless you run an analysis.
        </Text>
        {privacyUrl ? (
          <Text accessibilityRole="link" onPress={onOpenPrivacy} style={styles.consentLink}>
            Read the privacy policy
          </Text>
        ) : null}
        <Text style={styles.consentBody}>
          Analyses are hypothetical and are not financial, legal, or professional advice.
        </Text>
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Button label="Continue and analyze" onPress={onAccept} accessibilityHint="Allows sending the information described above" />
          <Button variant="secondary" label="Not now" onPress={onDecline} />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  question: { ...font.title, fontFamily: serif, fontSize: 22, lineHeight: 29 },
  helper: { ...font.small },
  modeCard: {
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
    borderWidth: 1,
  },
  modeFutures: { backgroundColor: colors.accent, borderColor: colors.accent },
  onDark: { color: colors.surface },
  onDarkMuted: { color: "#F3D9B5" },
  modeProsCons: { backgroundColor: colors.surface, borderColor: colors.line },
  modeEyebrow: { ...font.label, color: colors.warm },
  modeTitle: { ...font.title, fontSize: 20 },
  modeBody: { ...font.body },
  starter: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.paper,
    minHeight: 40,
    justifyContent: "center",
  },
  starterText: { fontSize: 14, color: colors.inkSoft },
  turn: { borderRadius: radius.md, padding: space.md, gap: 4 },
  turnUser: { backgroundColor: colors.paper, marginLeft: space.xl },
  turnAssistant: { backgroundColor: colors.accentSoft, marginRight: space.sm },
  turnRole: { ...font.label, color: colors.muted },
  inputRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 14 },
  consent: { padding: space.xl, gap: space.md, paddingBottom: space.xl * 2 },
  consentTitle: { ...font.title, fontFamily: serif, fontSize: 24, lineHeight: 31 },
  consentBody: { ...font.body },
  consentItem: { ...font.body, color: colors.ink },
  consentLink: { color: colors.accent, textDecorationLine: "underline", fontSize: 16, minHeight: 44, paddingVertical: 10 },
});
