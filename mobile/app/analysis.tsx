import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api, ApiError, type SignedResearch } from "../src/api";
import { FollowUpPanel, ConsentModal, ModePicker, SwitchMode, type ChatTurn } from "../src/components/flow";
import { Button, Card } from "../src/components/ui";
import { Disclaimer, FuturesResult, ProsConsResult, ResearchBlock } from "../src/components/results";
import { PRIVACY_URL } from "../src/config";
import { compactProfile, grantAiConsent, hasAiConsent, loadProfile } from "../src/storage";
import { colors, font, maxContentWidth, serif, space } from "../src/theme";
import type { DecisionContext, ModeId, ProsConsOutput, FuturesOutput, Profile } from "../src/types";

type Stage = "idle" | "researching" | "analyzing" | "ready" | "error";

const MODE_LABEL: Record<ModeId, string> = {
  futures: "Three possible futures",
  prosCons: "Pros & cons",
};

const STAGE_TEXT: Record<"researching" | "analyzing", (mode: ModeId) => string> = {
  researching: () => "Looking up current, credible information for your decision…",
  analyzing: (mode) =>
    mode === "futures"
      ? "Writing three possible futures from your details and the research. This can take a minute or two."
      : "Weighing advantages and disadvantages against your details. This can take a minute or two.",
};

export default function AnalysisScreen() {
  const params = useLocalSearchParams<{ decision?: string }>();
  const decision = (params.decision ?? "").trim();

  const [profile, setProfile] = useState<Profile>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);

  const [mode, setMode] = useState<ModeId | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [research, setResearch] = useState<SignedResearch | null>(null);
  const [results, setResults] = useState<Partial<Record<ModeId, unknown>>>({});
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Guards against overlapping requests and stale responses.
  const requestId = useRef(0);
  const pendingMode = useRef<ModeId | null>(null);

  const context: DecisionContext = useMemo(
    () => ({ decision, profile: compactProfile(profile) }),
    [decision, profile],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, consented] = await Promise.all([loadProfile(), hasAiConsent()]);
      if (!alive) return;
      setProfile(p);
      setConsentChecked(true);
      setConsentVisible(!consented);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runMode = useCallback(
    async (target: ModeId, existingResearch: SignedResearch | null) => {
      const id = ++requestId.current;
      pendingMode.current = target;
      setMode(target);
      setError(null);
      setChatError(null);

      let current = existingResearch;
      try {
        if (!current) {
          setStage("researching");
          current = await api.research(context);
          if (id !== requestId.current) return;
          setResearch(current);
        }

        setStage("analyzing");
        const response = await api.analyze(context, target, current);
        if (id !== requestId.current) return;

        setResearch({ brief: response.brief, signature: response.signature });
        setResults((prev) => ({ ...prev, [target]: response.analysis }));
        setStage("ready");
      } catch (err) {
        if (id !== requestId.current) return;
        // Research expired on the server (e.g. after a restart): start fresh once.
        if (err instanceof ApiError && err.code === "research_invalid" && current) {
          setResearch(null);
          return runMode(target, null);
        }
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        setStage("error");
      }
    },
    [context],
  );

  const choose = useCallback(
    (target: ModeId) => {
      if (results[target]) {
        setMode(target);
        setStage("ready");
        setError(null);
        return;
      }
      void runMode(target, research);
    },
    [results, research, runMode],
  );

  const ask = async (question: string) => {
    const analysis = mode ? results[mode] : undefined;
    if (!mode || !analysis || !research) return;
    setChatBusy(true);
    setChatError(null);
    try {
      const history = chat.slice(-12).map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }));
      const { answer } = await api.followup({ context, mode, analysis, research, history, question });
      setChat((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: answer }]);
    } catch (err) {
      setChatError(err instanceof ApiError ? err.message : "That question could not be answered. Please try again.");
    } finally {
      setChatBusy(false);
    }
  };

  const onAcceptConsent = async () => {
    await grantAiConsent();
    setConsentVisible(false);
  };

  const onDeclineConsent = () => {
    setConsentVisible(false);
    router.back();
  };

  const activeAnalysis = mode ? results[mode] : undefined;
  const loading = stage === "researching" || stage === "analyzing";
  const showPicker = !mode && stage === "idle";

  if (!decision) {
    return (
      <View style={styles.center}>
        <Text style={font.body}>No decision was provided.</Text>
        <Button label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.decisionBlock}>
          <Text style={styles.decisionLabel}>Your decision</Text>
          <Text style={styles.decisionText} accessibilityRole="header">
            {decision}
          </Text>
        </View>

        {consentChecked && !consentVisible && showPicker ? <ModePicker onSelect={choose} /> : null}

        {loading && mode ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[font.body, { flex: 1 }]} accessibilityLiveRegion="polite">
                {STAGE_TEXT[stage as "researching" | "analyzing"](mode)}
              </Text>
            </View>
            <Text style={font.small}>{MODE_LABEL[mode]}</Text>
          </Card>
        ) : null}

        {stage === "error" ? (
          <Card>
            <Text style={styles.errorTitle}>We could not complete that</Text>
            <Text style={font.body}>{error}</Text>
            <View style={{ gap: space.sm, marginTop: space.sm }}>
              <Button label="Try again" onPress={() => pendingMode.current && void runMode(pendingMode.current, research)} />
              <Button variant="secondary" label="Choose a different format" onPress={() => { setMode(null); setStage("idle"); setError(null); }} />
            </View>
          </Card>
        ) : null}

        {mode && activeAnalysis && stage === "ready" ? (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEyebrow}>{MODE_LABEL[mode]}</Text>
              <Text style={styles.resultLead}>
                {mode === "futures"
                  ? "Three hypothetical ways this could unfold for you."
                  : "Five advantages and five disadvantages, tied to your situation."}
              </Text>
            </View>

            {mode === "futures" ? (
              <FuturesResult data={activeAnalysis as FuturesOutput} />
            ) : (
              <ProsConsResult data={activeAnalysis as ProsConsOutput} />
            )}

            <SwitchMode current={mode} onSwitch={choose} />

            {research ? <ResearchBlock research={research.brief} /> : null}
            <Disclaimer />

            <FollowUpPanel turns={chat} busy={chatBusy} error={chatError} onAsk={ask} />
          </>
        ) : null}

        {stage === "ready" && research && PRIVACY_URL ? (
          <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.privacyLink}>
            How your information is used
          </Text>
        ) : null}
      </ScrollView>

      <ConsentModal
        visible={consentVisible}
        onAccept={onAcceptConsent}
        onDecline={onDeclineConsent}
        privacyUrl={PRIVACY_URL}
        onOpenPrivacy={() => router.push("/legal")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xl * 2,
    width: "100%",
    maxWidth: maxContentWidth,
    alignSelf: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.lg },
  decisionBlock: { gap: 4 },
  decisionLabel: { ...font.label, color: colors.muted },
  decisionText: { fontFamily: serif, fontSize: 22, lineHeight: 30, color: colors.ink },
  loadingRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
  errorTitle: { ...font.title, color: colors.danger },
  resultHeader: { gap: 4 },
  resultEyebrow: { ...font.label, color: colors.warm },
  resultLead: { ...font.body },
  privacyLink: { color: colors.accent, textAlign: "center", paddingVertical: space.sm, minHeight: 44 },
});
