import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Card } from "../src/components/ui";
import { deleteLocalData, loadProfile, saveProfile } from "../src/storage";
import type { Profile } from "../src/types";
import { colors, font, maxContentWidth, space } from "../src/theme";

type Field = { key: keyof Profile; label: string; hint: string; placeholder: string; multiline?: boolean; max: number };

const FIELDS: Field[] = [
  { key: "age", label: "Age", hint: "Approximate is fine.", placeholder: "29", max: 20 },
  { key: "location", label: "Where you live now", hint: "City or region.", placeholder: "Chicago, IL", max: 120 },
  { key: "savings", label: "Savings you could put toward this", hint: "A rough figure helps a lot.", placeholder: "About $8,000", max: 60 },
  { key: "income", label: "Income", hint: "Roughly, per year or per month.", placeholder: "$62,000 a year", max: 60 },
  { key: "education", label: "Education", hint: "Highest level and field.", placeholder: "Bachelor's in graphic design", max: 200 },
  { key: "employment", label: "Work now", hint: "Role, and how long you have done it.", placeholder: "Product designer, 3 years", max: 200 },
  { key: "careerGoals", label: "Career goals", hint: "Where you want your work to go.", placeholder: "Lead a design team", multiline: true, max: 400 },
  { key: "priorities", label: "What matters most to you", hint: "Stability, adventure, family, time, money…", placeholder: "Stability and being near family", multiline: true, max: 400 },
  { key: "notes", label: "Anything else", hint: "Constraints, commitments, or context.", placeholder: "Partner and I are deciding together", multiline: true, max: 800 },
];

export default function ProfileScreen() {
  const [values, setValues] = useState<Profile>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      setValues(p);
      setLoaded(true);
    });
  }, []);

  const update = (key: keyof Profile, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const save = async () => {
    await saveProfile(values);
    router.back();
  };

  const erase = () => {
    Alert.alert(
      "Delete your details?",
      "This removes your profile and your AI permission from this device. Your past analyses are not stored anywhere else.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteLocalData();
            setValues({});
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.lead}>
        Everything here is optional. Share only what you are comfortable with. The details stay on your device until you run an analysis.
      </Text>

      <Card>
        {FIELDS.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <Text style={font.small}>{f.hint}</Text>
            <TextInput
              value={values[f.key] ?? ""}
              onChangeText={(t) => update(f.key, t.slice(0, f.max))}
              placeholder={f.placeholder}
              placeholderTextColor={colors.muted}
              accessibilityLabel={f.label}
              editable={loaded}
              multiline={f.multiline}
              textAlignVertical={f.multiline ? "top" : "center"}
              style={[styles.input, f.multiline && { minHeight: 84 }]}
            />
          </View>
        ))}
      </Card>

      <Button label="Save details" onPress={save} />
      <Button variant="secondary" label="Delete my details from this device" onPress={erase} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  lead: { ...font.body },
  field: { gap: 4, paddingVertical: space.xs },
  label: { ...font.title, fontSize: 16 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.paper,
    marginTop: 4,
  },
});
