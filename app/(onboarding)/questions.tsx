import { api } from "@/convex/_generated/api";
import { ProgressBar } from "@/components/ProgressBar";
import { Question, QuestionCard } from "@/components/QuestionCard";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QuestionsScreen() {
  const { userId } = useAuth();
  const router = useRouter();

  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const questions = useQuery(api.questions.getAll);
  const userAnswers = useQuery(
    api.answers.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );
  const upsertAnswer = useMutation(api.answers.upsert);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize answers from existing data
  useEffect(() => {
    if (userAnswers && questions) {
      const existingAnswers: Record<string, string> = {};
      for (const answer of userAnswers) {
        existingAnswers[answer.questionId] = answer.value;
      }
      setAnswers(existingAnswers);

      // Find first unanswered question
      const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
      const firstUnanswered = sortedQuestions.findIndex(
        (q) => !existingAnswers[q._id]
      );
      if (firstUnanswered > 0) {
        setCurrentIndex(firstUnanswered);
      }
    }
  }, [userAnswers, questions]);

  const sortedQuestions = questions
    ? [...questions].sort((a, b) => a.order - b.order)
    : [];

  const currentQuestion = sortedQuestions[currentIndex] as Question | undefined;
  const totalQuestions = sortedQuestions.length || 100; // Default to 100 if not loaded
  const currentAnswer = currentQuestion ? answers[currentQuestion._id] || "" : "";

  // Calculate category progress
  const categoryProgress = useMemo(() => {
    if (!currentQuestion?.category || !sortedQuestions.length) {
      return { progress: 0, category: "" };
    }

    const category = currentQuestion.category;
    const categoryQuestions = sortedQuestions.filter((q) => q.category === category);
    const categoryStartIndex = sortedQuestions.findIndex((q) => q.category === category);
    const positionInCategory = currentIndex - categoryStartIndex;
    const progress = (positionInCategory + 1) / categoryQuestions.length;

    return { progress, category };
  }, [currentQuestion?.category, currentIndex, sortedQuestions]);

  const handleAnswerChange = useCallback((value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion._id]: value,
    }));
  }, [currentQuestion]);

  const saveCurrentAnswer = async () => {
    if (!currentUser?._id || !currentQuestion || !currentAnswer) return;

    setSaving(true);
    try {
      await upsertAnswer({
        userId: currentUser._id,
        questionId: currentQuestion._id as any,
        value: currentAnswer,
      });
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
    setSaving(false);
  };

  const handleNext = async () => {
    await saveCurrentAnswer();

    if (currentIndex < sortedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All questions answered, go to complete
      router.push("/(onboarding)/complete");
    }
  };

  const handleBack = async () => {
    if (currentAnswer) {
      await saveCurrentAnswer();
    }
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const canProceed = currentAnswer.trim().length > 0;
  const isLastQuestion = currentIndex === sortedQuestions.length - 1;

  // Loading state
  if (!questions || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading questions...</Text>
          <Text style={styles.loadingSubtext}>
            {questions?.length === 0
              ? "No questions found. Please seed the questions database."
              : "Please wait..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.header}>
          <ProgressBar
            current={currentIndex + 1}
            total={totalQuestions}
            category={categoryProgress.category}
            categoryProgress={categoryProgress.progress}
          />
        </View>

        <View style={styles.content}>
          {currentIndex === 0 && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>
                Your progress is saved automatically. Feel free to close the app and continue anytime.
              </Text>
            </View>
          )}
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleAnswerChange}
            />
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {currentIndex > 0 && (
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
                disabled={saving}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.nextButton,
                (!canProceed || saving) && styles.buttonDisabled,
                currentIndex === 0 && styles.nextButtonFull,
              ]}
              onPress={handleNext}
              disabled={!canProceed || saving}
            >
              <Text style={styles.nextButtonText}>
                {saving
                  ? "Saving..."
                  : isLastQuestion
                    ? "Finish"
                    : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loadingSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  tipContainer: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  tipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
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
  nextButtonFull: {
    flex: 1,
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
