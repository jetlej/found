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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Height options in feet/inches format
const generateHeightOptions = () => {
  const options: { label: string; inches: number }[] = [];
  for (let feet = 4; feet <= 7; feet++) {
    for (let inches = 0; inches < 12; inches++) {
      if (feet === 4 && inches < 6) continue;
      if (feet === 7 && inches > 6) break;
      const totalInches = feet * 12 + inches;
      options.push({
        label: `${feet}'${inches}"`,
        inches: totalInches,
      });
    }
  }
  return options;
};

const HEIGHT_OPTIONS = generateHeightOptions();

export default function HeightScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [heightInches, setHeightInches] = useState<number | null>(null);
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
      if (currentUser.heightInches) setHeightInches(currentUser.heightInches);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const canProceed = !!heightInches;

  const handleContinue = async () => {
    if (!userId || !canProceed) return;

    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, heightInches });
      await setOnboardingStep({ clerkId: userId, step: "photos" });
      goToNextStep(router, "height");
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <Text style={styles.question}>How tall are you?</Text>

          <ScrollView
            style={styles.heightPicker}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.heightPickerContent}
          >
            {HEIGHT_OPTIONS.map((h) => (
              <Pressable
                key={h.inches}
                style={[
                  styles.heightOption,
                  heightInches === h.inches && styles.heightOptionSelected,
                ]}
                onPress={() => setHeightInches(h.inches)}
              >
                <Text
                  style={[
                    styles.heightOptionText,
                    heightInches === h.inches && styles.heightOptionTextSelected,
                  ]}
                >
                  {h.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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
  heightPicker: {
    flex: 1,
    marginTop: spacing.lg,
  },
  heightPickerContent: {
    paddingBottom: spacing.xl,
  },
  heightOption: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heightOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  heightOptionText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  heightOptionTextSelected: {
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
