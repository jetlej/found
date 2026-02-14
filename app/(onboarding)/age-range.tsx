import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { goToNextStep } from "@/lib/onboarding-flow";
import { colors, fontSizes, spacing } from "@/lib/theme";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Dimensions, StyleSheet, Switch, Text, View } from "react-native";
import { OnboardingScreen } from "@/components/OnboardingScreen";

const SLIDER_LENGTH = Dimensions.get("window").width - spacing.xl * 2;

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AgeRangeScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [minAge, setMinAge] = useState(23);
  const [maxAge, setMaxAge] = useState(33);
  const [isDealbreaker, setIsDealbreaker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.ageRangeMin != null && currentUser.ageRangeMax != null) {
        setMinAge(currentUser.ageRangeMin);
        setMaxAge(currentUser.ageRangeMax);
        setIsDealbreaker(currentUser.ageRangeDealbreaker ?? false);
      } else if (currentUser.birthdate) {
        // Default: own age -5 to +5, clamped to 18-99
        const myAge = calculateAge(currentUser.birthdate);
        setMinAge(Math.max(18, myAge - 5));
        setMaxAge(Math.min(99, myAge + 5));
      }
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateBasics({
        clerkId: userId,
        ageRangeMin: minAge,
        ageRangeMax: maxAge,
        ageRangeDealbreaker: isDealbreaker,
      });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "height" });
      goToNextStep(router, "age-range", isEditing);
    } catch {
      setLoading(false);
    }
  };

  return (
    <OnboardingScreen
      question="What age range are you looking for?"
      canProceed={true}
      loading={loading}
      onNext={handleContinue}
      onBack={isEditing ? () => router.back() : undefined}
    >
      <Text style={styles.rangeDisplay}>
        {minAge} – {maxAge} years old
      </Text>

      <View style={styles.sliderContainer}>
        <MultiSlider
          values={[minAge, maxAge]}
          min={18}
          max={99}
          step={1}
          sliderLength={SLIDER_LENGTH}
          onValuesChange={(values) => {
            setMinAge(values[0]);
            setMaxAge(values[1]);
          }}
          selectedStyle={{ backgroundColor: colors.primary }}
          unselectedStyle={{ backgroundColor: colors.border }}
          markerStyle={styles.marker}
          pressedMarkerStyle={styles.markerPressed}
        />
        <View style={styles.labels}>
          <Text style={styles.endLabel}>18</Text>
          <Text style={styles.endLabel}>99</Text>
        </View>
      </View>

      <View style={styles.dealbreakerContainer}>
        <Text style={styles.dealbreakerLabel}>This is a dealbreaker</Text>
        <Switch
          value={isDealbreaker}
          onValueChange={setIsDealbreaker}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  rangeDisplay: {
    fontSize: fontSizes["2xl"],
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  sliderContainer: {
    alignItems: "center",
  },
  marker: {
    backgroundColor: colors.primary,
    height: 24,
    width: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  markerPressed: {
    backgroundColor: colors.primary,
    height: 28,
    width: 28,
    borderRadius: 14,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xs,
  },
  endLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  dealbreakerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    marginTop: spacing["2xl"],
  },
  dealbreakerLabel: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: "500",
  },
});
