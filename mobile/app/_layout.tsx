import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Elsewhere" }} />
        <Stack.Screen name="analysis" options={{ title: "Your analysis" }} />
        <Stack.Screen name="profile" options={{ title: "About you" }} />
        <Stack.Screen name="legal" options={{ title: "Privacy & terms" }} />
      </Stack>
    </>
  );
}
