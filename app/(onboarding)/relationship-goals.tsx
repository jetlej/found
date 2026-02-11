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
  { value: "marriage", label: "Marriage" },
  { value: "long_term", label: "Long-term partner" },
  { value: "life_partner", label: "Life partner (no marriage)" },
  { value: "figuring_out", label: "Figuring it out" },
];

export default function RelationshipGoalsScreen() {
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
      if (currentUser.relationshipGoal) setSelected(currentUser.relationshipGoal);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !selected) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, relationshipGoal: selected });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "relationship-type" });
      goToNextStep(router, "relationship-goals", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="What are you looking for?" canProceed={!!selected} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined}>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionButton key={opt.value} label={opt.label} selected={selected === opt.value} onPress={() => setSelected(opt.value)} />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md, marginTop: spacing.lg },
});
