import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Button, Card } from "../src/components/ui";
import { API_URL } from "../src/config";
import { compactProfile, loadProfile } from "../src/storage";
import { safetyLevel } from "../src/safety";
import { colors, font, maxContentWidth, radius, serif, space } from "../src/theme";

const MAX = 500;

const EXAMPLES = [
  "What if I moved to New York?",
  "Should I start my own business?",
  "What if I changed careers into nursing?",
  "Should I go back to college?",
  "What if I bought a house this year?",
];

export default function HomeScreen() {
  const [decision, setDecision] = useState("");
  const [hasProfile, setHasProfile] = useState(false);

  // Re-read the profile whenever this screen gains focus, so edits on the About you screen show up here.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadProfile().then((p) => alive && setHasProfile(Boolean(compactProfile(p))));
      return () => {
        alive = false;
      };
    }, []),
  );

  const level = safetyLevel(decision);
  const ready = decision.trim().length >= 5 && level !== "crisis";

  const start = () => {
    if (!ready) return;
    router.push({ pathname: "/analysis", params: { decision: decision.trim() } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {!API_URL ? (
          <Card style={{ backgroundColor: colors.warmSoft, borderColor: colors.warmSoft }}>
            <Text style={font.small}>
              This build is not connected to the analysis service. Set EXPO_PUBLIC_API_URL for this build profile.
            </Text>
          </Card>
        ) : null}

        {level === "crisis" ? (
          <Card style={{ backgroundColor: colors.negativeSoft, borderColor: colors.negativeSoft }} accessibilityLabel="Support">
            <Text style={[font.title, { color: colors.negative }]}>You don't have to handle this alone</Text>
            <Text style={font.body}>
              Elsewhere can't help with this, but people can right now. In the US, call or text 988 (Suicide & Crisis Lifeline), any time. Outside the US, see findahelpline.com. If you might hurt yourself, call your local emergency number.
            </Text>
          </Card>
        ) : null}
        {level === "support" ? (
          <Card style={{ backgroundColor: colors.warmSoft, borderColor: colors.warmSoft }}>
            <Text style={font.small}>
              That sounds heavy. If you're struggling, you can talk to someone any time: in the US, call or text 988. Outside the US, see findahelpline.com.
            </Text>
          </Card>
        ) : null}

        <Text style={styles.display} accessibilityRole="header">
          What decision are you weighing?
        </Text>
        <Text style={styles.lead}>
          Describe it in your own words. Elsewhere will show you realistic ways it could unfold, using current, cited information.
        </Text>

        <View style={styles.inputWrap}>
          <TextInput
            value={decision}
            onChangeText={(t) => setDecision(t.slice(0, MAX))}
            placeholder="What if I moved to New York?"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Your decision"
            accessibilityHint="Describe the decision you are considering"
            multiline
            style={styles.input}
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
          <Text style={styles.counter}>
            {decision.length}/{MAX}
          </Text>
        </View>

        <View style={styles.examples} accessibilityLabel="Example decisions">
          {EXAMPLES.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={`Use example: ${e}`}
              onPress={() => setDecision(e)}
              style={({ pressed }) => [styles.example, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.exampleText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Button label="Continue" onPress={start} disabled={!ready} accessibilityHint="Choose how to explore this decision" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasProfile ? "Edit the details about you" : "Add details about you, optional"}
          onPress={() => router.push("/profile")}
          style={styles.profileLink}
        >
          <Text style={styles.profileLinkText}>
            {hasProfile ? "Your details are saved · Edit" : "Add details about you (optional)"}
          </Text>
          <Text style={styles.profileHint}>
            The more relevant context you share, the more personal the analysis. Everything is optional.
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable accessibilityRole="link" onPress={() => router.push("/legal")} style={styles.footerLink}>
            <Text style={styles.footerText}>Privacy & terms</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space.lg,
    paddingBottom: space.xl * 2,
    gap: space.lg,
    width: "100%",
    maxWidth: maxContentWidth,
    alignSelf: "center",
  },
  display: { ...font.display, fontFamily: serif, marginTop: space.sm },
  lead: { ...font.body },
  inputWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.xs,
  },
  input: { minHeight: 120, fontSize: 18, lineHeight: 26, color: colors.ink },
  counter: { ...font.small, alignSelf: "flex-end" },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  example: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    minHeight: 40,
    justifyContent: "center",
  },
  exampleText: { fontSize: 14, color: colors.inkSoft },
  profileLink: { minHeight: 44, gap: 4, paddingVertical: space.sm },
  profileLinkText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  profileHint: { ...font.small },
  footer: { alignItems: "center", marginTop: space.lg },
  footerLink: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.md },
  footerText: { ...font.small, textDecorationLine: "underline" },
});
