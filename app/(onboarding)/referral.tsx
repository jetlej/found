import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReferralScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const userId = useEffectiveUserId();
  const applyReferralCode = useMutation(api.users.applyReferralCode);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a referral code");
      return;
    }

    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const result = await applyReferralCode({
        clerkId: userId,
        code: code.trim(),
      });

      if (result.success) {
        setSuccess(
          result.referrerName
            ? `Code applied! ${result.referrerName} referred you.`
            : "Code applied!"
        );
        // Wait a moment to show success, then continue
        setTimeout(() => {
          continueToBasics();
        }, 1500);
      } else {
        setError(result.error ?? "Invalid code");
        setLoading(false);
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const continueToBasics = async () => {
    if (userId) {
      await setOnboardingStep({ clerkId: userId, step: "basics" });
    }
    router.push("/(onboarding)/basics");
  };

  const handleSkip = () => {
    continueToBasics();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backArrow} onPress={() => router.dismissAll()}>
        <IconChevronLeft size={28} color={colors.text} />
      </Pressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <Text style={styles.title}>Have a referral code?</Text>
              <Text style={styles.subtitle}>
                If someone invited you to Found, enter their code below to help them skip the line.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, code.length > 0 && styles.inputWithText]}
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  setError("");
                  setSuccess("");
                }}
                placeholder="Enter code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                editable={!loading && !success}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <Pressable
              style={styles.button}
              onPress={handleApply}
              disabled={loading || !!success || !code.trim()}
            >
              <Text style={styles.buttonText}>
                {loading ? "Submitting..." : "Submit"}
              </Text>
            </Pressable>

            <Text style={styles.orText}>or</Text>

            <Pressable
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading || !!success}
            >
              <Text style={styles.skipText}>I don't have a code</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backArrow: {
    position: "absolute",
    left: spacing.lg,
    top: spacing["3xl"],
    zIndex: 1,
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  header: {
    marginBottom: spacing["2xl"],
  },
  title: {
    fontFamily: fonts.logo,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: fontSizes.xl,
    color: colors.text,
    textAlign: "center",
    fontWeight: "600",
  },
  inputWithText: {
    letterSpacing: 4,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.sm,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  success: {
    color: colors.success,
    fontSize: fontSizes.sm,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  orText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginVertical: spacing.lg,
  },
  skipButton: {
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
  },
});
