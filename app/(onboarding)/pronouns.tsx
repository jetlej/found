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

const OPTIONS = ["he/him", "she/her", "they/them", "Other", "Prefer not to say"];

export default function PronounsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [pronouns, setPronouns] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.pronouns) setPronouns(currentUser.pronouns);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !pronouns) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, pronouns });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "gender" });
      goToNextStep(router, "pronouns", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="What are your pronouns?" canProceed={!!pronouns} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined}>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionButton key={opt} label={opt} selected={pronouns === opt} onPress={() => setPronouns(opt)} />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md, marginTop: spacing.lg },
});
