import { Question, QuestionCard } from "@/components/QuestionCard";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { CategoryId, getCategoryById } from "@/lib/categories";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconX } from "@tabler/icons-react-native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QuestionsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId = params.categoryId as CategoryId | undefined;

  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip",
  );
  const questions = useQuery(api.questions.getAll);
  const userAnswers = useQuery(
    api.answers.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const upsertAnswer = useMutation(api.answers.upsert);
  const completeCategory = useMutation(api.users.completeCategory);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dealbreakers, setDealbreakers] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Screen ready state for smooth fade-in from splash
  const {
    isReady: screenReady,
    setReady: setScreenReady,
    fadeAnim,
  } = useScreenReady();

  // Get category info
  const category = categoryId ? getCategoryById(categoryId) : undefined;

  // Filter questions by category
  const categoryQuestions = useMemo(() => {
    if (!questions || !category) return [];
    const [start, end] = category.questionRange;
    return [...questions]
      .filter((q) => q.order >= start && q.order <= end)
      .sort((a, b) => a.order - b.order);
  }, [questions, category]);

  // Initialize answers from existing data and find first unanswered question
  useEffect(() => {
    if (userAnswers && categoryQuestions.length > 0 && !initialized) {
      const existingAnswers: Record<string, string> = {};
      const existingDealbreakers: Record<string, boolean> = {};
      for (const answer of userAnswers) {
        existingAnswers[answer.questionId] = answer.value;
        if (answer.isDealbreaker !== undefined) {
          existingDealbreakers[answer.questionId] = answer.isDealbreaker;
        }
      }
      setAnswers(existingAnswers);
      setDealbreakers(existingDealbreakers);

      // Find first unanswered question in this category
      const firstUnansweredIndex = categoryQuestions.findIndex(
        (q) => !existingAnswers[q._id],
      );
      if (firstUnansweredIndex !== -1) {
        setCurrentIndex(firstUnansweredIndex);
      } else {
        // If all answered, jump to the last question
        setCurrentIndex(categoryQuestions.length - 1);
      }

      setInitialized(true);
    }
  }, [userAnswers, categoryQuestions, initialized]);

  const currentQuestion = categoryQuestions[currentIndex] as
    | Question
    | undefined;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion._id] || ""
    : "";
  const currentDealbreaker = currentQuestion
    ? dealbreakers[currentQuestion._id]
    : undefined;
  const totalQuestions = categoryQuestions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Auto-populate default value for scale questions
  useEffect(() => {
    if (currentQuestion?.type === "scale" && !answers[currentQuestion._id]) {
      const min = currentQuestion.scaleMin ?? 1;
      const max = currentQuestion.scaleMax ?? 10;
      const defaultValue = Math.floor((min + max) / 2);
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion._id]: String(defaultValue),
      }));
    }
  }, [currentQuestion?._id, currentQuestion?.type]);

  const handleAnswerChange = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion._id]: value,
      }));
    },
    [currentQuestion],
  );

  const handleDealbreakerChange = useCallback(
    (isDealbreaker: boolean) => {
      if (!currentQuestion) return;
      setDealbreakers((prev) => ({
        ...prev,
        [currentQuestion._id]: isDealbreaker,
      }));
    },
    [currentQuestion],
  );

  const saveCurrentAnswer = async () => {
    if (!currentUser?._id || !currentQuestion || !currentAnswer) return;

    setSaving(true);
    try {
      await upsertAnswer({
        userId: currentUser._id,
        questionId: currentQuestion._id as any,
        value: currentAnswer,
        source: "manual",
        isDealbreaker: dealbreakers[currentQuestion._id],
      });
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
    setSaving(false);
  };

  const finishCategory = async () => {
    if (!userId || !categoryId) return;

    try {
      await completeCategory({ clerkId: userId, categoryId });
      // Navigate back to journey tab with completed category for animation
      router.replace(`/(tabs)/journey?completed=${categoryId}`);
    } catch (err) {
      console.error("Failed to complete category:", err);
    }
  };

  const handleNext = async () => {
    await saveCurrentAnswer();

    if (isLastQuestion) {
      await finishCategory();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBack = async () => {
    if (currentAnswer) {
      await saveCurrentAnswer();
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      // On first question, go back to journey
      router.back();
    }
  };

  const canProceed = currentAnswer.trim().length > 0;

  // Mark screen as ready when data is loaded
  const dataReady =
    questions && questions.length > 0 && initialized && category;
  useEffect(() => {
    if (dataReady && !screenReady) {
      setScreenReady(true);
    }
  }, [dataReady, screenReady]);

  // Keep splash visible until data is ready
  if (!dataReady) {
    return null;
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft} />
              <Text style={styles.categoryLabel}>{category.name}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={async () => {
                  if (currentAnswer) {
                    await saveCurrentAnswer();
                  }
                  router.back();
                }}
              >
                <IconX size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {currentIndex + 1}/{totalQuestions}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <QuestionCard
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleAnswerChange}
              isDealbreaker={currentDealbreaker}
              onDealbreakerChange={handleDealbreakerChange}
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
                disabled={saving}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.nextButton,
                  (!canProceed || saving) && styles.buttonDisabled,
                ]}
                onPress={handleNext}
                disabled={!canProceed || saving}
              >
                <Text style={styles.nextButtonText}>
                  {saving ? "Saving..." : isLastQuestion ? "Complete" : "Next"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerLeft: {
    width: 36,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.text,
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
