import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Screen = "profile" | "waitlist";

export default function CompleteScreen() {
  const { userId } = useAuth();
  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip"
  );
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  // Get the parsed profile
  const userProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>("profile");

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

  // Render a section with tags
  const renderTags = (items: string[], color: string = colors.text) => (
    <View style={styles.tagsContainer}>
      {items.map((item, index) => (
        <View key={index} style={[styles.tag, { borderColor: color }]}>
          <Text style={[styles.tagText, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );

  // Render a trait bar
  const renderTraitBar = (
    label: string,
    value: number,
    leftLabel: string,
    rightLabel: string
  ) => (
    <View style={styles.traitRow}>
      <Text style={styles.traitLabel}>{label}</Text>
      <View style={styles.traitBarContainer}>
        <Text style={styles.traitEndLabel}>{leftLabel}</Text>
        <View style={styles.traitBar}>
          <View
            style={[styles.traitBarFill, { width: `${(value / 10) * 100}%` }]}
          />
          <View
            style={[styles.traitBarDot, { left: `${(value / 10) * 100}%` }]}
          />
        </View>
        <Text style={styles.traitEndLabel}>{rightLabel}</Text>
      </View>
    </View>
  );

  // Waitlist Screen
  if (currentScreen === "waitlist") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitlistScreen}>
          <Pressable
            style={styles.backButton}
            onPress={() => setCurrentScreen("profile")}
          >
            <Text style={styles.backButtonText}>← Back to Profile</Text>
          </Pressable>

          <View style={styles.waitlistContent}>
            <View style={styles.celebration}>
              <Text style={styles.emoji}>⏳</Text>
            </View>

            <Text style={styles.title}>You're on the list!</Text>

            <View style={styles.waitlistCard}>
              <Text style={styles.waitlistLabel}>Your waitlist position</Text>
              <Text style={styles.waitlistNumber}>
                #{waitlistPosition ?? "..."}
              </Text>
            </View>

            <Text style={styles.waitlistMessage}>
              We're currently in beta and matching is coming soon.{"\n\n"}
              We'll notify you when it's your turn to start meeting people.
            </Text>

            <View style={styles.waitlistFooter}>
              <Text style={styles.footerText}>
                In the meantime, tell your friends about Found.{"\n"}
                The more people who join, the better your matches will be.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Profile Analysis Screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.celebration}>
          <Text style={styles.emoji}>🎉</Text>
        </View>

        <Text style={styles.title}>You did it!</Text>
        <Text style={styles.subtitle}>
          Thanks for answering all 100 questions.{"\n"}
          Here's what we learned about you.
        </Text>

        {/* Profile Analysis Section */}
        {!userProfile ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color={colors.text} />
            <Text style={styles.loadingText}>
              Analyzing your answers with AI...
            </Text>
          </View>
        ) : (
          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>Your Profile Analysis</Text>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(userProfile.confidence * 100)}%
            </Text>

            {/* Values */}
            {userProfile.values.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Core Values</Text>
                {renderTags(userProfile.values, "#2563eb")}
              </View>
            )}

            {/* Interests */}
            {userProfile.interests.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Interests</Text>
                {renderTags(userProfile.interests, "#059669")}
              </View>
            )}

            {/* Dealbreakers */}
            {userProfile.dealbreakers.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Dealbreakers</Text>
                {renderTags(userProfile.dealbreakers, "#dc2626")}
              </View>
            )}

            {/* Personality Traits */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Personality Traits</Text>
              {renderTraitBar(
                "Social Energy",
                userProfile.traits.introversion,
                "Extrovert",
                "Introvert"
              )}
              {renderTraitBar(
                "Adventure",
                userProfile.traits.adventurousness,
                "Routine",
                "Spontaneous"
              )}
              {renderTraitBar(
                "Ambition",
                userProfile.traits.ambition,
                "Content",
                "Driven"
              )}
              {renderTraitBar(
                "Emotional Openness",
                userProfile.traits.emotionalOpenness,
                "Private",
                "Open"
              )}
              {renderTraitBar(
                "Values",
                userProfile.traits.traditionalValues,
                "Progressive",
                "Traditional"
              )}
              {renderTraitBar(
                "Independence",
                userProfile.traits.independenceNeed,
                "Together",
                "Independent"
              )}
            </View>

            {/* Relationship Style */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Relationship Style</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Love Language</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.relationshipStyle.loveLanguage}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Conflict Style</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.relationshipStyle.conflictStyle}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Communication</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.relationshipStyle.communicationFrequency}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Finances</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.relationshipStyle.financialApproach}
                  </Text>
                </View>
              </View>
            </View>

            {/* Family Plans */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Family Plans</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Wants Kids</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.familyPlans.wantsKids}
                  </Text>
                </View>
                {userProfile.familyPlans.kidsTimeline && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Timeline</Text>
                    <Text style={styles.infoValue}>
                      {userProfile.familyPlans.kidsTimeline}
                    </Text>
                  </View>
                )}
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Family Closeness</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.familyPlans.familyCloseness}/10
                  </Text>
                </View>
              </View>
            </View>

            {/* Lifestyle */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Lifestyle</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Sleep Schedule</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.lifestyle.sleepSchedule}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Exercise</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.lifestyle.exerciseLevel}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Alcohol</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.lifestyle.alcoholUse}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Location Pref</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.lifestyle.locationPreference}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Pets</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.lifestyle.petPreference}
                  </Text>
                </View>
              </View>
            </View>

            {/* Keywords */}
            {userProfile.keywords.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Keywords</Text>
                {renderTags(userProfile.keywords, colors.textSecondary)}
              </View>
            )}
          </View>
        )}

        {/* Continue Button */}
        <Pressable
          style={[styles.continueButton, !userProfile && styles.buttonDisabled]}
          onPress={() => setCurrentScreen("waitlist")}
          disabled={!userProfile}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["2xl"],
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
  loadingSection: {
    alignItems: "center",
    padding: spacing.xl,
    marginBottom: spacing.xl,
    width: "100%",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  profileSection: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  confidenceText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  subsection: {
    marginBottom: spacing.lg,
  },
  subsectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: fontSizes.sm,
  },
  traitRow: {
    marginBottom: spacing.md,
  },
  traitLabel: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  traitBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  traitEndLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    width: 70,
  },
  traitBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    position: "relative",
  },
  traitBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.text,
    borderRadius: 3,
    opacity: 0.3,
  },
  traitBarDot: {
    position: "absolute",
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text,
    marginLeft: -7,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  infoItem: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: "45%",
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: "500",
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing["2xl"],
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.surface,
    fontSize: fontSizes.base,
    fontWeight: "600",
  },
  // Waitlist screen styles
  waitlistScreen: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
  waitlistContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  waitlistMessage: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  waitlistFooter: {
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
