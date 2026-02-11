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
import { ImportanceSlider } from "@/components/ImportanceSlider";

const POLITICS_OPTIONS = [
  "Liberal", "Moderate", "Conservative", "Not political", "Prefer not to say",
];

export default function PoliticsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [politicalLeaning, setPoliticalLeaning] = useState<string | null>(null);
  const [importance, setImportance] = useState(5);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.politicalLeaning) setPoliticalLeaning(currentUser.politicalLeaning);
      if (currentUser.politicalImportance) setImportance(currentUser.politicalImportance);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !politicalLeaning) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, politicalLeaning, politicalImportance: importance });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "pets" });
      goToNextStep(router, "politics", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="Where do you lean politically?" canProceed={!!politicalLeaning} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined} scrollable>
      <View style={styles.options}>
        {POLITICS_OPTIONS.map((opt) => (
          <OptionButton key={opt} label={opt} selected={politicalLeaning === opt} onPress={() => setPoliticalLeaning(opt)} variant="chip" />
        ))}
      </View>
      <ImportanceSlider value={importance} onChange={setImportance} />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
