import { api } from "@/convex/_generated/api";
import { ProgressBar } from "@/components/ProgressBar";
import { Question, QuestionCard } from "@/components/QuestionCard";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMMKVObject } from "react-native-mmkv";

type FlowMode = "answering" | "review-prompt" | "reviewing";

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
  const clearAiAnswers = useMutation(api.answers.clearAiAnswers);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerSources, setAnswerSources] = useState<Record<string, "ai" | "manual">>({});
  const [saving, setSaving] = useState(false);
  const [flowMode, setFlowMode] = useState<FlowMode>("answering");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [showClearAiModal, setShowClearAiModal] = useState(false);

  // History stack of question IDs we've visited (for back navigation)
  const [visitedStack, setVisitedStack] = useState<string[]>([]);

  // Screen ready state for smooth fade-in from splash
  const { isReady: screenReady, setReady: setScreenReady, fadeAnim } = useScreenReady();

  // Get AI-answered question IDs from MMKV (for current session's newly imported answers)
  const [sessionAiAnswers, setSessionAiAnswers] = useMMKVObject<number[]>("ai-answered-questions");

  const sortedQuestions = useMemo(
    () => (questions ? [...questions].sort((a, b) => a.order - b.order) : []),
    [questions]
  );

  // Get the list of unanswered questions
  // A question is "unanswered" if it has no answer OR if it only has an AI answer (not yet manually confirmed)
  const unansweredQuestions = useMemo(() => {
    if (!sortedQuestions.length) return [];
    return sortedQuestions.filter((q) => {
      const hasAnswer = answers[q._id];
      const source = answerSources[q._id];
      // Unanswered if: no answer, OR in visited stack (currently working on)
      return !hasAnswer || visitedStack.includes(q._id);
    });
  }, [sortedQuestions, answers, answerSources, visitedStack]);

  // Current question is either from visited stack (if going back) or first unanswered
  const currentQuestionId = visitedStack.length > 0 ? visitedStack[visitedStack.length - 1] : null;

  // Get the list of AI-answered questions for review
  // Use session MMKV for newly imported answers, or fall back to database source field
  const aiQuestionsToReview = useMemo(() => {
    if (!sortedQuestions.length) return [];
    
    // If we have session AI answers (just imported), use those
    if (sessionAiAnswers?.length) {
      return sortedQuestions.filter((q) => sessionAiAnswers.includes(q.order));
    }
    
    // Otherwise, use the source field from database
    return sortedQuestions.filter((q) => answerSources[q._id] === "ai");
  }, [sessionAiAnswers, sortedQuestions, answerSources]);

  // Initialize answers from existing data and set first unanswered question
  useEffect(() => {
    if (userAnswers && questions && !initialized) {
      const existingAnswers: Record<string, string> = {};
      const existingSources: Record<string, "ai" | "manual"> = {};
      for (const answer of userAnswers) {
        existingAnswers[answer.questionId] = answer.value;
        if (answer.source) {
          existingSources[answer.questionId] = answer.source;
        }
      }
      setAnswers(existingAnswers);
      setAnswerSources(existingSources);

      // Find first unanswered question (questions without manual answers)
      // AI-answered questions that haven't been manually reviewed are still "unanswered"
      const sorted = [...questions].sort((a, b) => a.order - b.order);
      const firstUnanswered = sorted.find((q) => {
        const hasAnswer = existingAnswers[q._id];
        const source = existingSources[q._id];
        // Consider unanswered if: no answer, OR has AI answer (needs review)
        return !hasAnswer || source === "ai";
      });
      
      if (firstUnanswered) {
        setVisitedStack([firstUnanswered._id]);
      }

      setInitialized(true);
    }
  }, [userAnswers, questions, initialized]);

  // Current question based on flow mode
  const currentQuestion = useMemo(() => {
    if (flowMode === "answering") {
      if (currentQuestionId) {
        return sortedQuestions.find((q) => q._id === currentQuestionId) as Question | undefined;
      }
      // Find next unanswered question not in stack
      const nextUnanswered = sortedQuestions.find(
        (q) => !answers[q._id] && !visitedStack.includes(q._id)
      );
      return nextUnanswered as Question | undefined;
    } else if (flowMode === "reviewing") {
      return aiQuestionsToReview[reviewIndex] as Question | undefined;
    }
    return undefined;
  }, [flowMode, currentQuestionId, sortedQuestions, answers, visitedStack, aiQuestionsToReview, reviewIndex]);

  const totalQuestions = sortedQuestions.length || 100;
  const currentAnswer = currentQuestion ? answers[currentQuestion._id] || "" : "";
  const answeredCount = Object.keys(answers).length;

  // Auto-populate default value for scale questions (so Next is enabled by default)
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

  // Calculate progress display
  const progressInfo = useMemo(() => {
    if (flowMode === "reviewing") {
      return {
        current: reviewIndex + 1,
        total: aiQuestionsToReview.length,
      };
    }
    // Show how many are answered out of total
    return {
      current: answeredCount + (currentAnswer ? 0 : 1),
      total: totalQuestions,
    };
  }, [flowMode, reviewIndex, aiQuestionsToReview.length, answeredCount, currentAnswer, totalQuestions]);

  // Calculate category info
  const categoryInfo = useMemo(() => {
    if (!currentQuestion?.category || !sortedQuestions.length) {
      return { category: "", position: 0, total: 0 };
    }

    const category = currentQuestion.category;
    const categoryQuestions = sortedQuestions.filter((q) => q.category === category);
    const questionIndexInAll = sortedQuestions.findIndex((q) => q._id === currentQuestion._id);
    const categoryStartIndex = sortedQuestions.findIndex((q) => q.category === category);
    const positionInCategory = questionIndexInAll - categoryStartIndex + 1; // 1-based

    return { 
      category, 
      position: positionInCategory, 
      total: categoryQuestions.length 
    };
  }, [currentQuestion, sortedQuestions]);

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
        source: "manual", // User is saving this answer, so it's manual
      });
      // Update local source tracking
      setAnswerSources((prev) => ({
        ...prev,
        [currentQuestion._id]: "manual",
      }));
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
    setSaving(false);
  };

  const finishOnboarding = async () => {
    // Clear session AI answered questions from storage
    setSessionAiAnswers([]);
    if (userId) {
      await setOnboardingStep({ clerkId: userId, step: "complete" });
    }
    router.push("/(onboarding)/complete");
  };

  const handleNext = async () => {
    await saveCurrentAnswer();

    if (flowMode === "answering") {
      // Find next unanswered question
      const nextUnanswered = sortedQuestions.find(
        (q) => !answers[q._id] && q._id !== currentQuestion?._id
      );

      if (nextUnanswered) {
        setVisitedStack((prev) => [...prev, nextUnanswered._id]);
      } else {
        // All questions answered
        if (aiQuestionsToReview.length > 0) {
          setFlowMode("review-prompt");
        } else {
          finishOnboarding();
        }
      }
    } else if (flowMode === "reviewing") {
      if (reviewIndex < aiQuestionsToReview.length - 1) {
        setReviewIndex(reviewIndex + 1);
      } else {
        finishOnboarding();
      }
    }
  };

  const handleBack = async () => {
    if (currentAnswer) {
      await saveCurrentAnswer();
    }

    if (flowMode === "answering") {
      if (visitedStack.length > 1) {
        // Go back to previous question in our visited stack
        setVisitedStack((prev) => prev.slice(0, -1));
      } else {
        // On first question, check if we have AI answers
        const hasAiAnswers = sessionAiAnswers?.length || Object.values(answerSources).some(s => s === "ai");
        if (hasAiAnswers) {
          // Show confirmation modal
          setShowClearAiModal(true);
        } else {
          // No AI answers, just go back
          router.replace("/(onboarding)/ai-import");
        }
      }
    } else if (flowMode === "reviewing") {
      if (reviewIndex > 0) {
        setReviewIndex(reviewIndex - 1);
      }
    }
  };

  const handleClearAiAndGoBack = async () => {
    // Clear AI answers from database
    if (currentUser?._id) {
      await clearAiAnswers({ userId: currentUser._id });
    }
    // Clear session AI answers
    setSessionAiAnswers([]);
    // Clear local state
    setAnswers({});
    setAnswerSources({});
    setVisitedStack([]);
    setShowClearAiModal(false);
    // Navigate back
    router.replace("/(onboarding)/ai-import");
  };

  const handleCancelClearAi = () => {
    setShowClearAiModal(false);
  };

  const handleStartReview = () => {
    setFlowMode("reviewing");
    setReviewIndex(0);
  };

  const handleSkipReview = () => {
    finishOnboarding();
  };

  const canProceed = currentAnswer.trim().length > 0;
  
  // Check if this is the last unanswered question
  const remainingUnanswered = sortedQuestions.filter(
    (q) => !answers[q._id] && q._id !== currentQuestion?._id
  );
  const isLastQuestion =
    flowMode === "answering"
      ? remainingUnanswered.length === 0
      : reviewIndex === aiQuestionsToReview.length - 1;
  
  const showBackButton = flowMode === "answering" ? true : reviewIndex > 0;

  // Mark screen as ready when data is loaded (triggers splash hide + fade-in)
  const dataReady = questions && questions.length > 0 && initialized;
  useEffect(() => {
    if (dataReady && !screenReady) {
      setScreenReady(true);
    }
  }, [dataReady, screenReady]);

  // Keep splash visible until data is ready
  if (!dataReady) {
    return null;
  }

  // All questions already answered - show review prompt or finish
  if (flowMode === "answering" && !currentQuestion) {
    if (aiQuestionsToReview.length > 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>All questions answered!</Text>
            <Text style={styles.promptSubtitle}>
              {aiQuestionsToReview.length} questions were answered by AI. Would you like to review them?
            </Text>
            <View style={styles.promptButtons}>
              <Pressable style={styles.primaryButton} onPress={handleStartReview}>
                <Text style={styles.primaryButtonText}>Review AI Answers</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleSkipReview}>
                <Text style={styles.secondaryButtonText}>Skip, looks good</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }
    finishOnboarding();
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
          {flowMode === "reviewing" && (
            <Text style={styles.reviewingLabel}>Reviewing AI Answers</Text>
          )}
          <ProgressBar
            current={progressInfo.current}
            total={progressInfo.total}
            category={categoryInfo.category}
            categoryPosition={categoryInfo.position}
            categoryTotal={categoryInfo.total}
          />
        </View>

        <View style={styles.content}>
          {flowMode === "answering" && visitedStack.length === 1 && !sessionAiAnswers?.length && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>
                Your progress is saved automatically. Feel free to close the app and continue anytime.
              </Text>
            </View>
          )}
          {flowMode === "reviewing" && reviewIndex === 0 && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>
                Review and edit the AI's answers. Tap "Skip Review" anytime to finish.
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
            {showBackButton && (
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
                !showBackButton && styles.nextButtonFull,
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
          {flowMode === "reviewing" && (
            <Pressable style={styles.skipReviewButton} onPress={handleSkipReview}>
              <Text style={styles.skipReviewText}>Skip Review</Text>
            </Pressable>
          )}
          </View>
        </KeyboardAvoidingView>

        {/* Review Prompt Modal */}
        <Modal
          visible={flowMode === "review-prompt"}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Review AI answers?</Text>
              <Text style={styles.modalSubtitle}>
                {aiQuestionsToReview.length} questions were answered by AI. Would you like to review and edit them?
              </Text>
              <View style={styles.modalButtons}>
                <Pressable style={styles.primaryButton} onPress={handleStartReview}>
                  <Text style={styles.primaryButtonText}>Yes, review them</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleSkipReview}>
                  <Text style={styles.secondaryButtonText}>No, looks good</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Clear AI Answers Confirmation Modal */}
        <Modal
          visible={showClearAiModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Go back?</Text>
              <Text style={styles.modalSubtitle}>
                This will clear your AI-imported answers. You can re-import them or answer manually.
              </Text>
              <View style={styles.modalButtons}>
                <Pressable style={styles.primaryButton} onPress={handleClearAiAndGoBack}>
                  <Text style={styles.primaryButtonText}>Clear and go back</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleCancelClearAi}>
                  <Text style={styles.secondaryButtonText}>Never mind</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  reviewingLabel: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: "center",
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
  skipReviewButton: {
    alignItems: "center",
    paddingTop: spacing.md,
  },
  skipReviewText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  // Prompt screen styles
  promptContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  promptTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["2xl"],
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  promptSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  promptButtons: {
    width: "100%",
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.text,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xl,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    gap: spacing.md,
  },
});
