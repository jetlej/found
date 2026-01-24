import { AppHeader } from "@/components/AppHeader";
import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
  TOTAL_VOICE_QUESTIONS,
  VOICE_QUESTIONS,
  VoiceQuestionIcon,
} from "@/lib/voice-questions";
import { useAuth } from "@clerk/clerk-expo";
import {
  IconBook,
  IconCheck,
  IconDiamond,
  IconHeart,
  IconLeaf,
  IconLock,
  IconMessage,
  IconPlant,
  IconSparkles,
  IconStar,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react-native";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type QuestionState = "completed" | "current" | "locked";

const ICONS: Record<VoiceQuestionIcon, React.ComponentType<{ size: number; color: string }>> = {
  diamond: IconDiamond,
  heart: IconHeart,
  book: IconBook,
  leaf: IconLeaf,
  users: IconUsers,
  target: IconTarget,
  message: IconMessage,
  star: IconStar,
  seedling: IconPlant,
  sparkles: IconSparkles,
};

export default function VoiceScreen() {
  const { userId } = useAuth();
  const router = useRouter();

  const fadeOpacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  useEffect(() => {
    SplashScreen.hideAsync();
    fadeOpacity.value = withTiming(1, { duration: 350 });
  }, []);

  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip"
  );

  const recordings = useQuery(
    api.voiceRecordings.getRecordingsForUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  // Create a map of questionIndex -> recording for quick lookup
  const recordingMap = useMemo(() => {
    if (!recordings) return new Map();
    return new Map(recordings.map((r) => [r.questionIndex, r]));
  }, [recordings]);

  const completedCount = recordings?.length ?? 0;

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
            Answer 10 questions with your voice. Be yourself — no editing, no
            second-guessing.
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                  {state === "locked" && <IconLock size={14} color="#AAAAAA" />}
                  </View>
                </Pressable>
              </View>
            );
          })}
          <View style={styles.bottomPadding} />
        </ScrollView>
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
    borderWidth: 2,
    borderColor: colors.border,
    zIndex: 1,
  },
  nodeCompleted: {
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  nodeCurrent: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  nodeLocked: {
    borderColor: "#AAAAAA",
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
  bottomPadding: {
    height: spacing["2xl"],
  },
});
