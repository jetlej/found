import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function Verify() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const hiddenInputRef = useRef<TextInput>(null);
  const { phone, isSignUp } = useLocalSearchParams<{
    phone: string;
    isSignUp: string;
  }>();

  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const router = useRouter();
  const createUser = useMutation(api.users.getOrCreate);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError("");

    if (digits.length === 6) {
      handleVerify(digits);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeToVerify = fullCode ?? code;
    if (codeToVerify.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUp === "true") {
        const result = await signUp?.attemptPhoneNumberVerification({
          code: codeToVerify,
        });

        if (result?.status === "complete") {
          try {
            await createUser({
              phone: phone!,
            });
          } catch (convexErr) {
            console.log("Convex error (continuing anyway):", convexErr);
          }

          await setSignUpActive?.({ session: result.createdSessionId });
          return;
        } else if (result?.status === "missing_requirements") {
          if (result.createdSessionId) {
            await setSignUpActive?.({ session: result.createdSessionId });
            if (result.createdUserId) {
              try {
                await createUser({
                  phone: phone!,
                });
              } catch (e) {
                console.log("Convex user creation error:", e);
              }
            }
            return;
          }
          setError("Additional info required. Check Clerk settings.");
          setLoading(false);
        } else {
          setError(`Unexpected status: ${result?.status}`);
          setLoading(false);
        }
      } else {
        const result = await signIn?.attemptFirstFactor({
          strategy: "phone_code",
          code: codeToVerify,
        });

        if (result?.status === "complete") {
          await setSignInActive?.({ session: result.createdSessionId });
          return;
        } else {
          setError(`Unexpected status: ${result?.status}`);
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid code");
      setCode("");
      hiddenInputRef.current?.focus();
      setLoading(false);
    }
  };

  const formatPhone = (phoneE164: string) => {
    const digits = phoneE164.replace(/\D/g, "").slice(-10);
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleResend = async () => {
    if (resendStatus !== "idle") return;
    setResendStatus("sending");
    try {
      if (isSignUp === "true") {
        await signUp?.preparePhoneNumberVerification();
      } else {
        const phoneFactor = signIn?.supportedFirstFactors?.find(
          (f) => f.strategy === "phone_code"
        ) as { phoneNumberId: string } | undefined;
        if (phoneFactor) {
          await signIn?.prepareFirstFactor({
            strategy: "phone_code",
            phoneNumberId: phoneFactor.phoneNumberId,
          });
        }
      }
    } catch (err) {
      console.log("Resend error:", err);
    }
    setResendStatus("sent");
    setTimeout(() => setResendStatus("idle"), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Enter code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{"\n"}
            {formatPhone(phone ?? "")}
          </Text>
        </View>

        <Pressable
          style={styles.codeContainer}
          onPress={() => hiddenInputRef.current?.focus()}
        >
          <TextInput
            ref={hiddenInputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={[styles.codeBox, code[index] && styles.codeBoxFilled]}
            >
              <Text style={styles.codeDigit}>{code[index] || ""}</Text>
            </View>
          ))}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => handleVerify()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.resendButton}
          onPress={handleResend}
          disabled={resendStatus !== "idle"}
        >
          <Text style={styles.resendText}>
            {resendStatus === "sending"
              ? "Sending..."
              : resendStatus === "sent"
                ? "Sent!"
                : "Didn't receive a code? "}
            {resendStatus === "idle" && (
              <Text style={styles.resendLink}>Resend</Text>
            )}
          </Text>
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
  },
  backButton: {
    marginTop: spacing.lg,
    marginBottom: spacing["2xl"],
  },
  backText: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
  },
  header: {
    marginBottom: spacing["2xl"],
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
    lineHeight: 24,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1,
  },
  codeBox: {
    width: 48,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  codeBoxFilled: {
    borderColor: colors.primary,
  },
  codeDigit: {
    fontSize: fontSizes["2xl"],
    fontWeight: "600",
    color: colors.text,
  },
  error: {
    color: colors.error,
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
    opacity: 0.6,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  resendButton: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  resendText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  resendLink: {
    color: colors.text,
    textDecorationLine: "underline",
  },
});
