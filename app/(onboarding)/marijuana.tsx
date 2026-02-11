import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { goToNextStep } from "@/lib/onboarding-flow";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { IconSquare, IconSquareCheckFilled } from "@tabler/icons-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { OptionButton } from "@/components/OptionButton";

const OPTIONS = ["Yes", "Sometimes", "No", "Prefer not to say"];

export default function MarijuanaScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.marijuana) setSelected(currentUser.marijuana);
      if (currentUser.marijuanaVisible !== undefined) setVisible(currentUser.marijuanaVisible);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  const handleContinue = async () => {
    if (!userId || !selected) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, marijuana: selected, marijuanaVisible: visible });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "drugs" });
      goToNextStep(router, "marijuana", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <OnboardingScreen question="Do you use marijuana?" canProceed={!!selected} loading={loading} onNext={handleContinue} onBack={isEditing ? () => router.back() : undefined}>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionButton key={opt} label={opt} selected={selected === opt} onPress={() => setSelected(opt)} />
        ))}
      </View>
      <Pressable style={styles.visibilityRow} onPress={() => setVisible(!visible)}>
        {visible ? (
          <IconSquareCheckFilled size={24} color={colors.primary} />
        ) : (
          <IconSquare size={24} color={colors.textMuted} />
        )}
        <Text style={styles.visibilityText}>Visible on profile</Text>
      </Pressable>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md, marginTop: spacing.lg },
  visibilityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing["2xl"] },
  visibilityText: { fontSize: fontSizes.base, color: colors.text },
});
