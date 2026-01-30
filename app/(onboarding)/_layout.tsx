import { ONBOARDING_FLOW, OnboardingStep, getPrevStep } from "@/lib/onboarding-flow";
import { colors, spacing } from "@/lib/theme";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingLayout() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract screen name from pathname like "/(onboarding)/name" -> "name"
  const screenName = pathname.split("/").pop() as OnboardingStep;
  const currentIndex = ONBOARDING_FLOW.indexOf(screenName);

  // Show header contents for all screens except referral (first screen) and modals
  const isInFlow = ONBOARDING_FLOW.includes(screenName);
  const showHeaderContents = isInFlow && screenName !== "referral";

  const handleBack = () => {
    // If there's history, use normal back navigation
    if (router.canGoBack()) {
      router.back();
    } else {
      // No history (app resumed directly to this screen) - navigate to previous step
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
      {/* Always render header container to prevent layout shift during transitions */}
      {isInFlow && (
        <View style={styles.header}>
          {showHeaderContents ? (
            <>
              <Pressable style={styles.backArrow} onPress={handleBack}>
                <IconChevronLeft size={28} color={colors.text} />
              </Pressable>
              <View style={styles.progressContainer}>
                {ONBOARDING_FLOW.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index <= currentIndex && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
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
        <Stack.Screen name="gender" />
        <Stack.Screen name="sexuality" />
        <Stack.Screen name="location" />
        <Stack.Screen name="birthday" />
        <Stack.Screen name="height" />
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
  backArrow: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginRight: 36,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  headerPlaceholder: {
    height: 28, // Same as icon size
  },
});
