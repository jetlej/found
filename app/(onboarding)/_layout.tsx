import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="referral" />
      <Stack.Screen name="basics" />
      <Stack.Screen name="photos" />
      <Stack.Screen 
        name="questions" 
        options={{
          presentation: "modal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen 
        name="voice-questions" 
        options={{
          presentation: "modal",
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
