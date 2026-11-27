import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { PRIVACY_SECTIONS, TERMS_SECTIONS, type LegalSection } from "../src/legal";
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "../src/config";
import { Button } from "../src/components/ui";
import { colors, font, maxContentWidth, serif, space } from "../src/theme";

export default function LegalScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title} accessibilityRole="header">
        Privacy policy
      </Text>
      <Text style={font.small}>Last updated 27 November 2026</Text>
      <Sections sections={PRIVACY_SECTIONS} />

      <Text style={[styles.title, { marginTop: space.lg }]} accessibilityRole="header">
        Terms of use
      </Text>
      <Sections sections={TERMS_SECTIONS} />

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {PRIVACY_URL ? <Button variant="secondary" label="Open the full privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} /> : null}
        {TERMS_URL ? <Button variant="secondary" label="Open the full terms" onPress={() => Linking.openURL(TERMS_URL)} /> : null}
        {SUPPORT_EMAIL ? <Button variant="text" label={`Contact support: ${SUPPORT_EMAIL}`} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} /> : null}
      </View>
    </ScrollView>
  );
}

function Sections({ sections }: { sections: LegalSection[] }) {
  return (
    <View style={{ gap: space.lg }}>
      {sections.map((s) => (
        <View key={s.heading} style={{ gap: space.sm }}>
          <Text style={styles.heading}>{s.heading}</Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={font.body}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  title: { ...font.title, fontFamily: serif, fontSize: 24, lineHeight: 31 },
  heading: { ...font.title, fontSize: 17 },
});
