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

const RELIGION_OPTIONS = [
  "Christian", "Catholic", "Jewish", "Muslim", "Hindu", "Buddhist",
  "Spiritual", "Agnostic", "Atheist", "Other", "Prefer not to say",
];

export default function ReligionScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [religion, setReligion] = useState<string | null>(null);
  const [importance, setImportance] = useState(5);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.religion) setReligion(currentUser.religion);
      if (currentUser.religionImportance) setImportance(currentUser.religionImportance);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !religion) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, religion, religionImportance: importance });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "politics" });
      goToNextStep(router, "religion", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="What are your religious beliefs?" canProceed={!!religion} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined} scrollable>
      <View style={styles.options}>
        {RELIGION_OPTIONS.map((opt) => (
          <OptionButton key={opt} label={opt} selected={religion === opt} onPress={() => setReligion(opt)} variant="chip" />
        ))}
      </View>
      <ImportanceSlider value={importance} onChange={setImportance} />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
