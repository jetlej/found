import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { generateAIPrompt } from "@/lib/ai-import";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
  IconArrowLeft,
  IconEdit,
  IconSparkles,
} from "@tabler/icons-react-native";
import { useMutation } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useMMKVObject } from "react-native-mmkv";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AIImportScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  // Screen ready state for smooth fade-in from splash
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  // Mark screen as ready immediately
  useEffect(() => {
    setScreenReady(true);
  }, []);

  // Store AI-answered question IDs for review flow
  const [, setAiAnsweredQuestions] = useMMKVObject<number[]>(
    "ai-answered-questions",
  );

  const handleBack = () => {
    router.replace("/(onboarding)/photos");
  };

  const handleUseAI = async () => {
    const prompt = generateAIPrompt();
    await Clipboard.setStringAsync(prompt);
    router.push("/(onboarding)/ai-paste");
  };

  const handleAnswerManually = async () => {
    // Clear any stored AI answers since they're skipping
    setAiAnsweredQuestions([]);
    if (userId) {
      await setOnboardingStep({ step: "questions" });
    }
    router.push("/(onboarding)/questions");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <IconArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Time for your 100 questions</Text>
          <Text style={styles.subtitle}>
            If you've been really open with ChatGPT or Claude, we'll give you a
            prompt to ask them—they can answer a lot of these for you. Or you
            can answer them manually.
          </Text>
        </View>

        <View style={styles.choiceContainer}>
          <Pressable style={styles.choiceButton} onPress={handleUseAI}>
            <IconSparkles size={24} color={colors.primaryText} />
            <Text style={styles.choiceButtonText}>Use AI to help answer</Text>
          </Pressable>

          <Text style={styles.orText}>or</Text>

          <Pressable style={styles.choiceButton} onPress={handleAnswerManually}>
            <IconEdit size={24} color={colors.primaryText} />
            <Text style={styles.choiceButtonText}>Answer manually</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  choiceContainer: {
    gap: spacing.lg,
  },
  choiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.xl,
  },
  choiceButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.primaryText,
  },
  orText: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
  },
});
