import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { goToNextStep } from "@/lib/onboarding-flow";
import { spacing } from "@/lib/theme";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { OptionButton } from "@/components/OptionButton";

const OPTIONS = [
  "White/Caucasian", "Black/African American", "Hispanic/Latino",
  "Asian", "Middle Eastern", "Native American",
  "Pacific Islander", "Mixed", "Other", "Prefer not to say",
];

export default function EthnicityScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [ethnicity, setEthnicity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.ethnicity) setEthnicity(currentUser.ethnicity);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !ethnicity) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, ethnicity });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "hometown" });
      goToNextStep(router, "ethnicity", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="What's your ethnicity?" canProceed={!!ethnicity} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined} scrollable>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionButton key={opt} label={opt} selected={ethnicity === opt} onPress={() => setEthnicity(opt)} variant="chip" />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
