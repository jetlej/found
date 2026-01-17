import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CompleteScreen() {
  const { userId } = useAuth();
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function complete() {
      if (!userId || completed) return;

      // Check if already completed
      if (currentUser?.onboardingComplete) {
        setWaitlistPosition(currentUser.waitlistPosition ?? 1);
        setCompleted(true);
        return;
      }

      try {
        const position = await completeOnboarding({ clerkId: userId });
        setWaitlistPosition(position ?? 1);
        setCompleted(true);
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
      }
    }

    if (currentUser !== undefined) {
      complete();
    }
  }, [userId, currentUser, completed]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.celebration}>
          <Text style={styles.emoji}>🎉</Text>
        </View>

        <Text style={styles.title}>You did it!</Text>
        <Text style={styles.subtitle}>
          Thanks for answering all 100 questions.{"\n"}
          We now know you better than most dating apps ever will.
        </Text>

        <View style={styles.waitlistCard}>
          <Text style={styles.waitlistLabel}>Your waitlist position</Text>
          <Text style={styles.waitlistNumber}>
            #{waitlistPosition ?? "..."}
          </Text>
        </View>

        <Text style={styles.comingSoon}>
          We're currently in beta and matching is coming soon.{"\n"}
          We'll notify you when it's your turn to start meeting people.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            In the meantime, tell your friends about Found.{"\n"}
            The more people who join, the better your matches will be.
          </Text>
        </View>
      </View>
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
    alignItems: "center",
  },
  celebration: {
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["4xl"],
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing["2xl"],
  },
  waitlistCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing["2xl"],
    width: "100%",
  },
  waitlistLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  waitlistNumber: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["5xl"],
    color: colors.text,
  },
  comingSoon: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing["3xl"],
  },
  footer: {
    position: "absolute",
    bottom: spacing["3xl"],
    left: spacing.xl,
    right: spacing.xl,
  },
  footerText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
