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
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export default function KidsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [hasChildren, setHasChildren] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.hasChildren) setHasChildren(currentUser.hasChildren);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !hasChildren) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, hasChildren });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "wants-kids" });
      goToNextStep(router, "kids", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="Do you have children?" canProceed={!!hasChildren} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined}>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionButton key={opt.value} label={opt.label} selected={hasChildren === opt.value} onPress={() => setHasChildren(opt.value)} variant="row" />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", gap: spacing.md },
});
