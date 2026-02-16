import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import {
  generateAIPrompt,
  getAnswerCount,
  parseAIResponse,
} from "@/lib/ai-import";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
  IconArrowLeft,
  IconCheck,
  IconCircleCheck,
  IconClipboard,
  IconCopy,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMMKVObject } from "react-native-mmkv";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AIPasteScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();

  const currentUser = useQuery(
    api.users.current,
    userId ? {} : "skip",
  );
  const questions = useQuery(api.questions.getAll);
  const upsertAnswer = useMutation(api.answers.upsert);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const [jsonInput, setJsonInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  // Store AI-answered question IDs for review flow
  const [, setAiAnsweredQuestions] = useMMKVObject<number[]>(
    "ai-answered-questions",
  );

  // Reset "just copied" state after 2 seconds
  useEffect(() => {
    if (justCopied) {
      const timer = setTimeout(() => setJustCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justCopied]);

  const handleBack = () => {
    router.back();
  };

  const handleCopyPrompt = async () => {
    const prompt = generateAIPrompt();
    await Clipboard.setStringAsync(prompt);
    setJustCopied(true);
  };

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setJsonInput(text);
    }
  };

  const handleImport = async () => {
    if (!currentUser?._id || !questions) return;

    setParsing(true);

    const result = parseAIResponse(jsonInput);

    if (!result.success || !result.data) {
      Alert.alert(
        "Import Error",
        result.error || "Could not parse the response",
      );
      setParsing(false);
      return;
    }

    const answerCount = getAnswerCount(result.data);

    // Create a map of question order -> question ID
    const questionMap = new Map(questions.map((q) => [q.order, q._id]));

    // Save all answers to Convex with source: "ai"
    const aiAnsweredOrders: number[] = [];
    try {
      for (const [orderStr, value] of Object.entries(result.data.answers)) {
        const order = parseInt(orderStr, 10);
        const questionId = questionMap.get(order);
        if (questionId) {
          await upsertAnswer({
            questionId: questionId as any,
            value: value,
            source: "ai",
          });
          aiAnsweredOrders.push(order);
        }
      }

      // Store which questions were AI-answered for review flow (for current session)
      setAiAnsweredQuestions(aiAnsweredOrders);
      setImportedCount(answerCount);
    } catch (err) {
      console.error("Failed to save answers:", err);
      Alert.alert("Error", "Failed to save some answers. Please try again.");
    }

    setParsing(false);
  };

  const handleContinue = async () => {
    if (userId) {
      await setOnboardingStep({ step: "questions" });
    }
    router.push("/(onboarding)/questions");
  };

  // Success state after import
  if (importedCount !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <IconCircleCheck size={64} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>
            {importedCount} of 100 questions answered!
          </Text>
          <Text style={styles.successSubtitle}>
            Now let's answer the remaining {100 - importedCount} questions
            together.
          </Text>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <IconArrowLeft size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>Step 1</Text>
            <Text style={styles.stepTitle}>Paste into ChatGPT or Claude</Text>
            <Pressable style={styles.copyButton} onPress={handleCopyPrompt}>
              {justCopied ? (
                <IconCheck size={18} color={colors.primaryText} />
              ) : (
                <IconCopy size={18} color={colors.primaryText} />
              )}
              <Text style={styles.copyButtonText}>
                {justCopied ? "Prompt Copied" : "Copy Prompt"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>Step 2</Text>
            <Text style={styles.stepTitle}>Paste the response here</Text>
            <Pressable
              style={styles.pasteButton}
              onPress={handlePasteFromClipboard}
            >
              <IconClipboard size={18} color={colors.text} />
              <Text style={styles.pasteButtonText}>Paste from clipboard</Text>
            </Pressable>
            <TextInput
              style={styles.jsonInput}
              multiline
              placeholder='{"answers": {"1": "...", ...}}'
              placeholderTextColor={colors.textPlaceholder}
              value={jsonInput}
              onChangeText={setJsonInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[
                styles.primaryButton,
                (!jsonInput.trim() || parsing) && styles.buttonDisabled,
              ]}
              onPress={handleImport}
              disabled={!jsonInput.trim() || parsing}
            >
              <Text style={styles.primaryButtonText}>
                {parsing ? "Importing..." : "Import Answers"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  stepContainer: {
    marginBottom: spacing.xl,
  },
  stepNumber: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  copyButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  pasteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pasteButtonText: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
  jsonInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.text,
    height: 150,
    maxHeight: 150,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  primaryButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["2xl"],
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  successSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
