import { AppHeader } from "@/components/AppHeader";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
  TOTAL_VOICE_QUESTIONS,
  VOICE_QUESTIONS,
  VoiceQuestionIcon,
} from "@/lib/voice-questions";
import {
  IconBook,
  IconAlertTriangle,
  IconCheck,
  IconDiamond,
  IconHeart,
  IconLeaf,
  IconListCheck,
  IconLock,
  IconPlant,
  IconSparkles,
  IconStar,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react-native";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Confetti - explosive burst from center
const CONFETTI_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#FF85A2",
  "#7BED9F",
  "#70A1FF",
  "#FFC048",
];
const CONFETTI_COUNT = 240;

function ConfettiParticle({ index }: { index: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const angle = Math.random() * Math.PI * 2;
  const velocity = 200 + Math.random() * 300;
  const targetX = Math.cos(angle) * velocity;
  const targetY = Math.sin(angle) * velocity - 100;
  const size = 5 + Math.random() * 8;
  const isCircle = Math.random() > 0.6;

  useEffect(() => {
    const d = Math.random() * 100;
    const dur = 600 + Math.random() * 400;
    const fallDur = 1200 + Math.random() * 800;
    scale.value = withDelay(d, withTiming(1, { duration: 80 }));
    translateX.value = withDelay(
      d,
      withTiming(targetX, { duration: dur, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      d,
      withSequence(
        withTiming(targetY, { duration: dur, easing: Easing.out(Easing.quad) }),
        withTiming(targetY + 600 + Math.random() * 300, {
          duration: fallDur,
          easing: Easing.in(Easing.quad),
        }),
      ),
    );
    rotate.value = withDelay(
      d,
      withTiming(720 * (Math.random() > 0.5 ? 1 : -1), {
        duration: dur + fallDur,
      }),
    );
    opacity.value = withDelay(
      d + dur + fallDur * 0.5,
      withTiming(0, { duration: fallDur * 0.5 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: "40%",
    left: "50%",
    width: size,
    height: isCircle ? size : size * 2.5,
    borderRadius: isCircle ? size / 2 : 2,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={style} />;
}

function Confetti() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}
    </View>
  );
}

function CelebrationText({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(800, withTiming(1, { duration: 500 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        },
        animStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type QuestionState = "completed" | "current" | "locked";

const ICONS: Record<
  VoiceQuestionIcon,
  React.ComponentType<{ size: number; color: string }>
> = {
  diamond: IconDiamond,
  heart: IconHeart,
  book: IconBook,
  leaf: IconLeaf,
  users: IconUsers,
  target: IconTarget,
  star: IconStar,
  seedling: IconPlant,
  sparkles: IconSparkles,
};

export default function QuestionsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();

  const fadeOpacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  useEffect(() => {
    SplashScreen.hideAsync();
    fadeOpacity.value = withTiming(1, { duration: 350 });
  }, []);

  const currentUser = useQuery(
    api.users.current,
    userId ? {} : "skip",
  );

  const recordings = useQuery(
    api.voiceRecordings.getRecordingsForUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  // Create a map of questionIndex -> recording for quick lookup
  const recordingMap = useMemo(() => {
    if (!recordings) return new Map();
    return new Map(recordings.map((r) => [r.questionIndex, r]));
  }, [recordings]);

  const myProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  const triggerParsing = useAction(
    api.actions.parseVoiceProfile.triggerVoiceProfileParsing,
  );
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateStartedAt, setRegenerateStartedAt] = useState<number | null>(
    null,
  );

  // Auto-dismiss celebration when profile is updated after regeneration
  useEffect(() => {
    if (
      regenerating &&
      regenerateStartedAt &&
      myProfile?.processedAt &&
      myProfile.processedAt > regenerateStartedAt
    ) {
      setRegenerating(false);
      setRegenerateStartedAt(null);
    }
  }, [regenerating, regenerateStartedAt, myProfile?.processedAt]);

  const completedCount = recordings?.length ?? 0;

  const basicsComplete = !!(
    currentUser?.ageRangeMin != null &&
    currentUser?.relationshipGoal &&
    currentUser?.wantsChildren &&
    currentUser?.religion &&
    currentUser?.politicalLeaning &&
    currentUser?.drinking &&
    currentUser?.drugs &&
    currentUser?.tattoos
  );

  const basicsStarted = currentUser?.completedCategories?.includes("the_basics") ?? false;
  const hasUnanswered = basicsStarted && !basicsComplete;

  const firstUnansweredBasicsStep = useMemo(() => {
    if (!currentUser) return "pronouns";
    const steps: { field: string; step: string }[] = [
      { field: "pronouns", step: "pronouns" },
      { field: "gender", step: "gender" },
      { field: "sexuality", step: "sexuality" },
      { field: "location", step: "location" },
      { field: "birthdate", step: "birthday" },
      { field: "ageRangeMin", step: "age-range" },
      { field: "heightInches", step: "height" },
      { field: "relationshipGoal", step: "relationship-goals" },
      { field: "relationshipType", step: "relationship-type" },
      { field: "hasChildren", step: "kids" },
      { field: "wantsChildren", step: "wants-kids" },
      { field: "ethnicity", step: "ethnicity" },
      { field: "hometown", step: "hometown" },
      { field: "religion", step: "religion" },
      { field: "politicalLeaning", step: "politics" },
      { field: "pets", step: "pets" },
      { field: "drinking", step: "drinking" },
      { field: "smoking", step: "smoking" },
      { field: "marijuana", step: "marijuana" },
      { field: "drugs", step: "drugs" },
      { field: "tattoos", step: "tattoos" },
    ];
    for (const { field, step } of steps) {
      if (!(currentUser as any)[field]) return step;
    }
    return "pronouns"; // all complete, start from beginning for editing
  }, [currentUser]);

  // Find first unanswered question index
  const firstUnansweredIndex = useMemo(() => {
    for (let i = 0; i < TOTAL_VOICE_QUESTIONS; i++) {
      if (!recordingMap.has(i)) return i;
    }
    return TOTAL_VOICE_QUESTIONS; // All done
  }, [recordingMap]);

  const handleQuestionPress = (index: number, state: QuestionState) => {
    if (state === "locked") return;
    router.push({
      pathname: "/(onboarding)/voice-questions",
      params: { startIndex: index.toString() },
    });
  };

  const getQuestionState = (index: number): QuestionState => {
    if (recordingMap.has(index)) return "completed";
    if (index === firstUnansweredIndex) return "current";
    return "locked";
  };

  const allComplete = completedCount === TOTAL_VOICE_QUESTIONS;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <AppHeader showLevelLink={false} />
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Answer 8 questions with your voice. Be yourself — no editing, no
            second-guessing.
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* The Basics - structured onboarding questions */}
          <View style={styles.nodeWrapper}>
            <View
              style={[
                styles.connector,
                (basicsComplete || hasUnanswered) && styles.connectorCompleted,
              ]}
            />
            <Pressable
              style={[
                styles.node,
                basicsComplete || hasUnanswered ? styles.nodeCompleted : styles.nodeCurrent,
              ]}
              onPress={() => {
                if (basicsComplete || hasUnanswered) {
                  router.push({ pathname: "/(onboarding)/basics-summary" });
                } else {
                  router.push({
                    pathname: `/(onboarding)/${firstUnansweredBasicsStep}`,
                    params: { editing: "true" },
                  });
                }
              }}
            >
              <View style={styles.nodeHeader}>
                <View style={styles.nodeHeaderLeft}>
                  <View style={styles.iconWrapper}>
                    <IconListCheck
                      size={21}
                      color={basicsComplete || hasUnanswered ? colors.text : "#FFFFFF"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.nodeName,
                      !basicsComplete && !hasUnanswered && styles.nodeNameCurrent,
                    ]}
                  >
                    The Basics
                  </Text>
                </View>
                {basicsComplete ? (
                  <View style={styles.completedBadge}>
                    <IconCheck size={14} color={colors.success} />
                    <Text style={styles.durationText}>Edit</Text>
                  </View>
                ) : hasUnanswered ? (
                  <View style={styles.completedBadge}>
                    <IconAlertTriangle size={14} color={colors.error} />
                    <Text style={[styles.durationText, { color: colors.error }]}>Update</Text>
                  </View>
                ) : (
                  <View style={styles.answerButton}>
                    <Text style={styles.answerButtonText}>Answer</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          {VOICE_QUESTIONS.map((question, index) => {
            const recording = recordingMap.get(question.index);
            const state = getQuestionState(question.index);
            const isLast = index === VOICE_QUESTIONS.length - 1;
            const Icon = ICONS[question.icon];

            const iconColor =
              state === "completed"
                ? colors.text
                : state === "current"
                  ? "#FFFFFF"
                  : "#AAAAAA";

            return (
              <View key={question.index} style={styles.nodeWrapper}>
                {!isLast && (
                  <View
                    style={[
                      styles.connector,
                      state === "completed" && styles.connectorCompleted,
                    ]}
                  />
                )}
                <Pressable
                  style={[
                    styles.node,
                    state === "completed" && styles.nodeCompleted,
                    state === "current" && styles.nodeCurrent,
                    state === "locked" && styles.nodeLocked,
                  ]}
                  onPress={() => handleQuestionPress(question.index, state)}
                  disabled={state === "locked"}
                >
                  <View style={styles.nodeHeader}>
                    <View style={styles.nodeHeaderLeft}>
                      <View style={styles.iconWrapper}>
                        <Icon size={21} color={iconColor} />
                      </View>
                      <Text
                        style={[
                          styles.nodeName,
                          state === "current" && styles.nodeNameCurrent,
                          state === "locked" && styles.nodeNameLocked,
                        ]}
                      >
                        {question.category}
                      </Text>
                    </View>
                    {state === "completed" && (
                      <View style={styles.completedBadge}>
                        <IconCheck size={14} color={colors.success} />
                        <Text style={styles.durationText}>
                          {formatDuration(recording!.durationSeconds)}
                        </Text>
                      </View>
                    )}
                    {state === "current" && (
                      <View style={styles.answerButton}>
                        <Text style={styles.answerButtonText}>Answer</Text>
                      </View>
                    )}
                    {state === "locked" && (
                      <IconLock size={14} color="#AAAAAA" />
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
          {allComplete && currentUser?._id && (
            <Pressable
              style={styles.regenerateButton}
              onPress={async () => {
                setRegenerateStartedAt(Date.now());
                setRegenerating(true);
                await triggerParsing({ userId: currentUser._id });
              }}
            >
              <Text style={styles.regenerateButtonText}>
                Regenerate Profile
              </Text>
            </Pressable>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {regenerating && (
          <View style={styles.celebrationOverlay}>
            <Confetti />
            <CelebrationText>
              <IconSparkles size={48} color={colors.text} />
              <Text style={styles.celebrationTitle}>Regenerating!</Text>
              <Text style={styles.celebrationSubtitle}>
                We're using AI to craft your updated profile and compatibility
                scores. This usually takes about a minute.
              </Text>
              <ActivityIndicator
                size="small"
                color={colors.textMuted}
                style={{ marginTop: spacing.xl }}
              />
            </CelebrationText>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  nodeWrapper: {
    position: "relative",
    marginBottom: spacing.md,
  },
  connector: {
    position: "absolute",
    left: 24,
    top: 56,
    bottom: -spacing.md - 4,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  connectorCompleted: {
    backgroundColor: colors.text,
  },
  node: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1,
  },
  nodeCompleted: {
    backgroundColor: colors.surface,
  },
  nodeCurrent: {
    backgroundColor: colors.text,
  },
  nodeLocked: {
    backgroundColor: colors.background,
  },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nodeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
  nodeName: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  nodeNameCurrent: {
    color: "#FFFFFF",
  },
  nodeNameLocked: {
    color: "#AAAAAA",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  durationText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  answerButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  answerButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: "600",
  },
  regenerateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  regenerateButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 10,
    overflow: "hidden",
  },
  celebrationContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  celebrationTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["4xl"],
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  celebrationSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  bottomPadding: {
    height: spacing["2xl"],
  },
});
