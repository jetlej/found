import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="basics" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="questions" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
