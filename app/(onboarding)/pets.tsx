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

const OPTIONS = ["Dog", "Cat", "Both", "Other", "None", "Prefer not to say"];

export default function PetsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.pets) setSelected(currentUser.pets);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !selected) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, pets: selected });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "drinking" });
      goToNextStep(router, "pets", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="Do you have pets?" canProceed={!!selected} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined}>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionButton key={opt} label={opt} selected={selected === opt} onPress={() => setSelected(opt)} variant="chip" />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
});
