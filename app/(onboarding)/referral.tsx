import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReferralScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const { userId } = useAuth();
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
    router.replace("/(onboarding)/basics");
  };

  const handleSkip = () => {
    continueToBasics();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Have a referral code?</Text>
          <Text style={styles.subtitle}>
            If someone invited you to Found, enter their code below.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
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
          style={[
            styles.button,
            (loading || success || !code.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleApply}
          disabled={loading || !!success || !code.trim()}
        >
          <Text style={styles.buttonText}>
            {loading ? "Applying..." : "Apply Code"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading || !!success}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </KeyboardAvoidingView>
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
    justifyContent: "center",
  },
  header: {
    marginBottom: spacing["2xl"],
  },
  title: {
    fontFamily: fonts.serifBold,
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
    letterSpacing: 4,
    fontWeight: "600",
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  skipButton: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    textDecorationLine: "underline",
  },
});
