import { ONBOARDING_FLOW, OnboardingStep, getPrevStep } from "@/lib/onboarding-flow";
import { colors, spacing } from "@/lib/theme";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const screenName = pathname.split("/").pop() as OnboardingStep;
  const isInFlow = ONBOARDING_FLOW.includes(screenName);
  const showBack = isInFlow && screenName !== "referral";

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
      {isInFlow && (
        <View style={styles.header}>
          {showBack ? (
            <Pressable style={styles.backArrow} onPress={handleBack}>
              <IconChevronLeft size={28} color={colors.text} />
            </Pressable>
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
        <Stack.Screen name="pronouns" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="sexuality" />
        <Stack.Screen name="location" />
        <Stack.Screen name="birthday" />
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
        <Stack.Screen name="edit-basics" options={{ animation: "slide_from_right" }} />
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
  },
  headerPlaceholder: {
    height: 28,
  },
});
