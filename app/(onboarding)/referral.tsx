import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { navigateForward } from "@/lib/onboarding-flow";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReferralScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const { signOut } = useAuth();
  const userId = useEffectiveUserId();
  const applyReferralCode = useMutation(api.users.applyReferralCode);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

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
    navigateForward(router, "referral");
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      if (userId) {
        await setOnboardingStep({ clerkId: userId, step: "basics" });
      }
      navigateForward(router, "referral");
    } catch {
      // Navigate anyway if mutation fails
      navigateForward(router, "referral");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
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

          <TouchableOpacity
            style={styles.button}
            onPress={handleApply}
            disabled={loading || skipping || !!success || !code.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? "Submitting..." : "Submit"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading || skipping || !!success}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>
              {skipping ? "Loading..." : "I don't have a code"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
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
  },
  inner: {
    flexGrow: 1,
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
  logoutButton: {
    alignItems: "center",
    paddingBottom: spacing.lg,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
});
