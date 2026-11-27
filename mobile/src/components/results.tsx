import { Linking, StyleSheet, Text, View } from "react-native";
import { Bullets, Card, Chip, Disclosure, Heading, LabeledText, Paragraph } from "./ui";
import { colors, font, serif, space } from "../theme";
import type { Advantage, Disadvantage, FuturesOutput, ProsConsOutput, ResearchBrief, Scenario, ScenarioKind } from "../types";

const KIND_TONE: Record<ScenarioKind, { label: string; fg: string; bg: string; accent: string }> = {
  positive: { label: "Positive outcome", fg: colors.positive, bg: colors.positiveSoft, accent: colors.positive },
  negative: { label: "Negative outcome", fg: colors.negative, bg: colors.negativeSoft, accent: colors.negative },
  mixed: { label: "Mixed outcome", fg: colors.mixed, bg: colors.mixedSoft, accent: colors.mixed },
};

const DISCLAIMER =
  "These are hypothetical developments to help you think, not predictions or guarantees. Facts cite the sources shown; everything else is an estimate or assumption. This is not financial, legal, or professional advice.";

export function Disclaimer() {
  return (
    <View style={styles.disclaimer} accessibilityRole="text">
      <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
    </View>
  );
}

export function FuturesResult({ data }: { data: FuturesOutput }) {
  return (
    <View style={{ gap: space.lg }}>
      {data.scenarios.map((s) => (
        <ScenarioCard key={s.kind} scenario={s} />
      ))}
      <AssumptionsBlock assumptions={data.assumptions} unknowns={data.unknowns} questions={data.followUpQuestions} />
    </View>
  );
}

function ScenarioCard({ scenario: s }: { scenario: Scenario }) {
  const tone = KIND_TONE[s.kind];
  return (
    <Card style={{ borderTopWidth: 3, borderTopColor: tone.accent }} accessibilityLabel={`${tone.label}: ${s.title}`}>
      <Chip label={tone.label} tone={{ fg: tone.fg, bg: tone.bg }} />
      <Text style={styles.scenarioTitle} accessibilityRole="header">
        {s.title}
      </Text>
      <Text style={styles.timeframe}>{s.timeframe}</Text>
      <Paragraph>{s.narrative}</Paragraph>

      {s.kind === "positive" && (
        <>
          <Disclosure title="How events unfold">
            <Bullets items={s.events} />
          </Disclosure>
          <Disclosure title="Opportunities that emerge">
            <Bullets items={s.opportunities} />
          </Disclosure>
          <Disclosure title="Important factors">
            <Bullets items={s.keyFactors} />
          </Disclosure>
          <Disclosure title="What you could do to make this more likely">
            <Bullets items={s.actions} />
          </Disclosure>
        </>
      )}
      {s.kind === "negative" && (
        <>
          <Disclosure title="Challenges and obstacles">
            <Bullets items={s.challenges} />
          </Disclosure>
          <Disclosure title="Warning signs">
            <Bullets items={s.warningSigns} />
          </Disclosure>
          <Disclosure title="Important factors">
            <Bullets items={s.keyFactors} />
          </Disclosure>
          <Disclosure title="Ways to reduce the likelihood or impact">
            <Bullets items={s.mitigations} />
          </Disclosure>
        </>
      )}
      {s.kind === "mixed" && (
        <>
          <Disclosure title="What goes well">
            <Bullets items={s.goesWell} />
          </Disclosure>
          <Disclosure title="What goes wrong">
            <Bullets items={s.goesWrong} />
          </Disclosure>
          <Disclosure title="Unexpected opportunities and difficulties">
            <Bullets items={[...s.unexpectedOpportunities, ...s.unexpectedDifficulties]} />
          </Disclosure>
          <Disclosure title="What you gain and what you give up">
            <Text style={styles.subhead}>Gains</Text>
            <Bullets items={s.gains} />
            <Text style={styles.subhead}>Sacrifices</Text>
            <Bullets items={s.sacrifices} />
          </Disclosure>
          <Disclosure title="Over time">
            <Paragraph>{s.longTermEffects}</Paragraph>
          </Disclosure>
        </>
      )}

      <Disclosure title="Financial, career and lifestyle">
        <LabeledText label="Financial" value={s.financial} />
        <LabeledText label="Career" value={s.career} />
        <LabeledText label="Lifestyle" value={s.lifestyle} />
      </Disclosure>
      {s.timeline.length > 0 && (
        <Disclosure title="Timeline (hypothetical)">
          <View style={{ gap: space.sm }}>
            {s.timeline.map((t, i) => (
              <View key={`${t.horizon}-${i}`} style={styles.timelineRow}>
                <Text style={styles.timelineHorizon}>{t.horizon}</Text>
                <Text style={[font.body, { flex: 1 }]}>{t.development}</Text>
              </View>
            ))}
          </View>
        </Disclosure>
      )}
    </Card>
  );
}

export function ProsConsResult({ data }: { data: ProsConsOutput }) {
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.md }}>
        <Heading>Five potential advantages</Heading>
        {data.advantages.map((a, i) => (
          <PointCard key={`adv-${i}`} index={i + 1} point={a} tone={colors.positive} />
        ))}
      </View>
      <View style={{ gap: space.md }}>
        <Heading>Five potential disadvantages</Heading>
        {data.disadvantages.map((d, i) => (
          <PointCard key={`dis-${i}`} index={i + 1} point={d} tone={colors.negative} />
        ))}
      </View>
      <AssumptionsBlock assumptions={data.assumptions} unknowns={data.unknowns} questions={data.followUpQuestions} />
    </View>
  );
}

function PointCard({ index, point, tone }: { index: number; point: Advantage | Disadvantage; tone: string }) {
  const mitigation = "mitigation" in point ? point.mitigation : "";
  return (
    <Card>
      <Text style={[styles.pointIndex, { color: tone }]}>{String(index).padStart(2, "0")}</Text>
      <Text style={styles.pointTitle} accessibilityRole="header">
        {point.title}
      </Text>
      <Paragraph>{point.explanation}</Paragraph>
      <Disclosure title="Why this could happen">
        <Paragraph>{point.whyItCouldOccur}</Paragraph>
      </Disclosure>
      <Disclosure title="How it relates to your situation">
        <Paragraph>{point.relevance}</Paragraph>
      </Disclosure>
      <Disclosure title="Potential impact and timing">
        <LabeledText label="Impact" value={point.impact} />
        <LabeledText label="When" value={point.timeframe} />
      </Disclosure>
      {mitigation ? (
        <Disclosure title="How to reduce it">
          <Paragraph>{mitigation}</Paragraph>
        </Disclosure>
      ) : null}
    </Card>
  );
}

function AssumptionsBlock({
  assumptions,
  unknowns,
  questions,
}: {
  assumptions: string[];
  unknowns: string[];
  questions: string[];
}) {
  if (assumptions.length === 0 && unknowns.length === 0 && questions.length === 0) return null;
  return (
    <Card>
      {assumptions.length > 0 && (
        <>
          <Heading>Assumptions we made</Heading>
          <Bullets items={assumptions} />
        </>
      )}
      {unknowns.length > 0 && (
        <>
          <Heading>What we could not determine</Heading>
          <Bullets items={unknowns} />
        </>
      )}
      {questions.length > 0 && (
        <>
          <Heading>Questions that would sharpen this</Heading>
          <Bullets items={questions} />
        </>
      )}
    </Card>
  );
}

export function ResearchBlock({ research }: { research: ResearchBrief }) {
  return (
    <Card>
      <Heading>Verified facts and sources</Heading>
      {research.status === "ok" && research.facts.length > 0 ? (
        <View style={{ gap: space.md }}>
          {research.summary ? <Paragraph>{research.summary}</Paragraph> : null}
          {research.facts.map((f, i) => (
            <View key={`${f.topic}-${i}`} style={{ gap: 2 }}>
              <Text style={styles.factTopic}>{f.topic}</Text>
              <Text style={font.body}>{f.fact}</Text>
              <Text
                accessibilityRole="link"
                onPress={() => Linking.openURL(f.sourceUrl)}
                style={styles.sourceLink}
              >
                Source: {f.sourceTitle}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Paragraph>
          Live research was not available for this decision
          {research.unavailableReason ? `: ${research.unavailableReason}` : "."} The analysis treats real-world figures as
          assumptions.
        </Paragraph>
      )}
      {research.unknowns.length > 0 && (
        <>
          <Text style={styles.subhead}>Still unknown</Text>
          <Bullets items={research.unknowns} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    backgroundColor: colors.warmSoft,
    borderRadius: 12,
    padding: space.md,
  },
  disclaimerText: { ...font.small, color: colors.inkSoft },
  scenarioTitle: { fontFamily: serif, fontSize: 22, lineHeight: 29, color: colors.ink, marginTop: space.xs },
  timeframe: { ...font.small, textTransform: "none" },
  pointIndex: { fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  pointTitle: { ...font.title, fontSize: 18, lineHeight: 24 },
  subhead: { fontSize: 13, fontWeight: "600", color: colors.ink, marginTop: space.xs },
  timelineRow: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  timelineHorizon: { width: 84, fontSize: 13, fontWeight: "700", color: colors.accent, paddingTop: 2 },
  factTopic: { ...font.label, color: colors.muted },
  sourceLink: { fontSize: 13, color: colors.accent, textDecorationLine: "underline", paddingVertical: 2 },
});
