import { ONBOARDING_FLOW, ONBOARDING_VISIBLE_STEPS, OnboardingStep, getPrevStep, getProgress } from "@/lib/onboarding-flow";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { Stack, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { editing } = useGlobalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";

  const screenName = pathname.split("/").pop() as OnboardingStep;
  const isInFlow = ONBOARDING_FLOW.includes(screenName);
  const isVisible = ONBOARDING_VISIBLE_STEPS.includes(screenName);
  const showBack = isInFlow && screenName !== "referral";
  const stepIndex = ONBOARDING_VISIBLE_STEPS.indexOf(screenName);
  const totalSteps = ONBOARDING_VISIBLE_STEPS.length;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      const prevStep = getPrevStep(screenName);
      if (prevStep) {
        router.replace({
          pathname: `/(onboarding)/${prevStep}`,
          params: { direction: "back" },
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isVisible && !isEditing && (
        <View style={styles.header}>
          {showBack ? (
            <Pressable style={styles.iconButton} onPress={handleBack}>
              <IconChevronLeft size={28} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: getProgress(screenName) }]} />
              <View style={{ flex: 1 - getProgress(screenName) }} />
            </View>
            <Text style={styles.stepText}>{stepIndex + 1} of {totalSteps}</Text>
          </View>
          <View style={styles.iconButton} />
        </View>
      )}
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          gestureEnabled: true,
          animation:
            (route.params as any)?.direction === "back"
              ? "slide_from_left"
              : "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
        })}
      >
        <Stack.Screen name="referral" />
        <Stack.Screen name="name" />
        <Stack.Screen name="pronouns" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="sexuality" />
        <Stack.Screen name="location" />
        <Stack.Screen name="birthday" />
        <Stack.Screen name="age-range" />
        <Stack.Screen name="height" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="relationship-goals" />
        <Stack.Screen name="relationship-type" />
        <Stack.Screen name="kids" />
        <Stack.Screen name="wants-kids" />
        <Stack.Screen name="ethnicity" />
        <Stack.Screen name="hometown" />
        <Stack.Screen name="religion" />
        <Stack.Screen name="politics" />
        <Stack.Screen name="pets" />
        <Stack.Screen name="drinking" />
        <Stack.Screen name="smoking" />
        <Stack.Screen name="marijuana" />
        <Stack.Screen name="drugs" />
        <Stack.Screen name="tattoos" />
        <Stack.Screen name="basics-summary" options={{ animation: "slide_from_right" }} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 28,
    justifyContent: "center",
  },
  progressWrapper: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  progressTrack: {
    width: 120,
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    flexDirection: "row",
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.text,
    borderRadius: 1.5,
  },
  stepText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});
