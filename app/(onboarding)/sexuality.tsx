import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { goToNextStep } from "@/lib/onboarding-flow";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const INTERESTED_IN = ["Men", "Women", "Everyone"];

export default function SexualityScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [interestedIn, setInterestedIn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Reset loading state when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
    }, [])
  );

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.sexuality) setInterestedIn(currentUser.sexuality);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const canProceed = !!interestedIn;

  const handleContinue = async () => {
    if (!userId || !canProceed) return;

    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, sexuality: interestedIn });
      await setOnboardingStep({ clerkId: userId, step: "location" });
      goToNextStep(router, "sexuality");
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <Text style={styles.question}>I'm interested in...</Text>
          <View style={styles.optionsColumn}>
            {INTERESTED_IN.map((option) => (
              <Pressable
                key={option}
                style={[styles.option, interestedIn === option && styles.optionSelected]}
                onPress={() => setInterestedIn(option)}
              >
                <Text style={[styles.optionText, interestedIn === option && styles.optionTextSelected]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (!canProceed || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canProceed || loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["2xl"],
  },
  question: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.xl,
  },
  optionsColumn: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  option: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  optionTextSelected: {
    color: colors.primaryText,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
