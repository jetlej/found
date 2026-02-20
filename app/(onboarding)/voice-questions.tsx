import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { TOTAL_VOICE_QUESTIONS, VOICE_QUESTIONS } from "@/lib/voice-questions";
import {
  IconEraser,
  IconEyeOff,
  IconMicrophone,
  IconPlayerPause,
  IconTrash,
  IconX,
  IconFileText,
  IconSparkles,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "convex/react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Confetti particle component - explosive burst from center
const CONFETTI_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#FF85A2", "#7BED9F", "#70A1FF", "#FFC048"];
const CONFETTI_COUNT = 240;

function ConfettiParticle({ index }: { index: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  // Burst in all directions from center
  const angle = Math.random() * Math.PI * 2;
  const velocity = 200 + Math.random() * 300;
  const targetX = Math.cos(angle) * velocity;
  const targetY = Math.sin(angle) * velocity - 100; // bias upward
  const size = 5 + Math.random() * 8;
  const isCircle = Math.random() > 0.6;

  useEffect(() => {
    const delay = Math.random() * 100; // very tight burst
    const duration = 600 + Math.random() * 400; // fast explosion
    const fallDuration = 1200 + Math.random() * 800; // then gravity

    scale.value = withDelay(delay, withTiming(1, { duration: 80 }));
    // Burst out fast, then fall with gravity
    translateX.value = withDelay(delay, withTiming(targetX, { duration, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(targetY, { duration, easing: Easing.out(Easing.quad) }),
        withTiming(targetY + 600 + Math.random() * 300, { duration: fallDuration, easing: Easing.in(Easing.quad) }),
      ),
    );
    rotate.value = withDelay(
      delay,
      withTiming(720 * (Math.random() > 0.5 ? 1 : -1), { duration: duration + fallDuration }),
    );
    opacity.value = withDelay(
      delay + duration + fallDuration * 0.5,
      withTiming(0, { duration: fallDuration * 0.5 }),
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
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }, style]}>
      {children}
    </Animated.View>
  );
}

// Sound wave visualization component using reanimated for smooth 60fps
const NUM_BARS = 7;

function SoundWave({ isRecording }: { isRecording: boolean }) {
  const bars = Array(NUM_BARS)
    .fill(0)
    .map((_, i) => {
      const height = useSharedValue(8);

      useEffect(() => {
        if (isRecording) {
          // Each bar animates with slightly different timing for organic feel
          const delay = i * 50;
          const duration = 150 + Math.random() * 100;

          height.value = withRepeat(
            withSequence(
              withTiming(20 + Math.random() * 40, { duration }),
              withTiming(8 + Math.random() * 15, { duration }),
            ),
            -1,
            true,
          );
        } else {
          height.value = withTiming(8, { duration: 200 });
        }
      }, [isRecording]);

      const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
      }));

      return <Animated.View key={i} style={[styles.soundBar, animatedStyle]} />;
    });

  return <View style={styles.soundWave}>{bars}</View>;
}

export default function VoiceQuestionsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const params = useLocalSearchParams<{ startIndex?: string }>();
  const startIndex = parseInt(params.startIndex || "0", 10);

  const currentUser = useQuery(
    api.users.current,
    userId ? {} : "skip",
  );
  const recordings = useQuery(
    api.voiceRecordings.getRecordingsForUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const saveRecording = useMutation(api.voiceRecordings.saveRecording);
  const deleteRecordingMutation = useMutation(
    api.voiceRecordings.deleteRecording,
  );
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const hasProfile = useQuery(
    api.userProfiles.hasProfile,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reanimated values
  const pulseScale = useSharedValue(1);
  const screenOpacity = useSharedValue(0);
  const questionOpacity = useSharedValue(1);
  const [screenReady, setScreenReady] = useState(false);
  const hasAnimated = useRef(false);
  const prevIndexRef = useRef(startIndex);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const questionFadeStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
  }));

  const progressWidth = useSharedValue((startIndex + 1) / TOTAL_VOICE_QUESTIONS);
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  // Create a map of questionIndex -> recording for quick lookup
  const recordingMap = useMemo(() => {
    if (!recordings) return new Map();
    return new Map(recordings.map((r) => [r.questionIndex, r]));
  }, [recordings]);

  const currentQuestion = VOICE_QUESTIONS[currentIndex];
  const existingRecording = recordingMap.get(currentIndex);
  const isLastQuestion = currentIndex === TOTAL_VOICE_QUESTIONS - 1;

  // Initialize starting index
  useEffect(() => {
    if (recordings && !initialized) {
      setCurrentIndex(startIndex);
      setInitialized(true);
    }
  }, [recordings, initialized, startIndex]);

  // Animate question content + progress bar on index change
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex;
      questionOpacity.value = 0;
      questionOpacity.value = withTiming(1, { duration: 400 });
      progressWidth.value = withTiming((currentIndex + 1) / TOTAL_VOICE_QUESTIONS, { duration: 300 });
    }
  }, [currentIndex]);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Mark screen as ready when data is loaded
  const dataReady = recordings !== undefined && initialized;
  useEffect(() => {
    if (dataReady && !screenReady) {
      setScreenReady(true);
    }
  }, [dataReady, screenReady]);

  // Fade in animation when screen is ready
  useEffect(() => {
    if (screenReady && !hasAnimated.current) {
      hasAnimated.current = true;
      SplashScreen.hideAsync();
      screenOpacity.value = withTiming(1, { duration: 350 });
    }
  }, [screenReady]);

  // Core recording function (separated for reuse after permission grant)
  const beginRecording = async () => {
    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Haptic feedback for start
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to begin recording:", err);
    }
  };

  const startRecording = async () => {
    try {
      const { status: existingStatus } = await Audio.getPermissionsAsync();

      if (existingStatus === "granted") {
        await beginRecording();
      } else {
        const { granted } = await Audio.requestPermissionsAsync();
        if (granted) {
          // Brief pause lets iOS audio session settle after permission grant
          await new Promise((r) => setTimeout(r, 300));
          await beginRecording();
        } else {
          console.error("Audio permission not granted");
        }
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);

    const recording = recordingRef.current;
    recordingRef.current = null;
    const finalDuration = recordingDuration;
    const questionIdx = currentIndex;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri || !currentUser?._id) return;

      // Upload + save in background — don't block navigation
      (async () => {
        try {
          const uploadUrl = await generateUploadUrl();
          const resp = await fetch(uri, { method: "GET" });
          const blob = await resp.blob();
          const uploadResp = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type || "audio/m4a" },
            body: blob,
          });
          const { storageId } = await uploadResp.json();
          await saveRecording({
            questionIndex: questionIdx,
            storageId,
            durationSeconds: finalDuration,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
          console.error("Failed to upload recording:", err);
        }
      })();
    } catch (err) {
      console.error("Failed to stop recording:", err);
    }
  };

  const pauseRecording = async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.pauseAsync();
    setIsPaused(true);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const resumeRecording = async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.startAsync();
    setIsPaused(false);
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const discardRecording = async () => {
    if (!recordingRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await recordingRef.current.stopAndUnloadAsync();
    recordingRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
  };

  const handleDelete = async () => {
    if (!currentUser?._id) return;

    // Light haptic for delete
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await deleteRecordingMutation({
        questionIndex: currentIndex,
      });
    } catch (err) {
      console.error("Failed to delete recording:", err);
    }
  };

  const handleNext = useCallback(() => {
    if (isPaused && recordingRef.current) {
      stopRecording();
    }
    setShowTranscript(false);
    if (isLastQuestion) {
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastQuestion, isPaused]);

  const handleBack = useCallback(() => {
    setShowTranscript(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      router.back();
    }
  }, [currentIndex, router]);

  const handleClose = useCallback(async () => {
    // Stop recording if in progress
    if (isRecording && recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsPaused(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    router.back();
  }, [isRecording, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  // Keep splash visible until data is ready
  if (!dataReady || !currentQuestion) {
    return null;
  }

  const hasRecording = !!existingRecording;
  const canProceed = hasRecording;

  if (submitted) {
    const profileReady = hasProfile === true;
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <View style={styles.celebrationContainer}>
          <Confetti />
          <CelebrationText>
            {profileReady
              ? <IconSparkles size={48} color={colors.text} />
              : <ActivityIndicator size="large" color={colors.text} style={{ marginBottom: spacing.sm }} />}
            <Text style={styles.celebrationTitle}>
              {profileReady ? "Time to Review Your Profile" : "Thanks for sharing!"}
            </Text>
            {profileReady ? (
              <View style={styles.checkmarkList}>
                <View style={styles.checkmarkRow}>
                  <IconEyeOff size={20} color={colors.text} />
                  <Text style={styles.checkmarkText}>Hide anything that feels inaccurate</Text>
                </View>
                <View style={styles.checkmarkRow}>
                  <IconEraser size={20} color={colors.text} />
                  <Text style={styles.checkmarkText}>Remove things you'd rather keep private</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.celebrationSubtitle}>
                We're using AI to craft your profile and compatibility scores. This usually takes about a minute.
              </Text>
            )}
          </CelebrationText>
          {profileReady && (
            <View style={styles.footer}>
              <Pressable
                style={styles.nextButton}
                onPress={() => router.push({ pathname: "/profile-audit", params: { firstTime: "true" } })}
              >
                <Text style={styles.nextButtonText}>Edit My Profile</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Animated.View style={[styles.flex, fadeStyle]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft} />
            <Text style={styles.categoryLabel}>{currentQuestion.category}</Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <IconX size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, progressBarStyle]} />
            </View>
            <Text style={styles.progressText}>
              {currentIndex + 1}/{TOTAL_VOICE_QUESTIONS}
            </Text>
          </View>
        </View>

        <Animated.View style={[styles.content, questionFadeStyle]}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>

          <View style={styles.recordingArea}>
            {hasRecording && !isRecording ? (
              // Has existing recording
              <View style={styles.recordedState}>
                <View style={styles.recordedBadge}>
                  <IconMicrophone size={24} color={colors.text} />
                  <Text style={styles.recordedDuration}>
                    {formatDuration(existingRecording.durationSeconds)}
                  </Text>
                </View>
                <Pressable style={styles.deleteButton} onPress={handleDelete}>
                  <IconTrash size={18} color={colors.error} />
                  <Text style={styles.deleteText}>Delete & Re-record</Text>
                </Pressable>
                <Pressable
                  style={styles.transcriptLink}
                  onPress={() => setShowTranscript(true)}
                >
                  <IconFileText size={14} color={colors.textMuted} />
                  <Text style={styles.transcriptLinkText}>Show transcript</Text>
                </Pressable>
              </View>
            ) : (
              // Ready / recording / paused — unified layout, no shift
              <View style={styles.recordingState}>
                {isRecording && !isPaused ? (
                  <Animated.View style={pulseStyle}>
                    <Pressable style={styles.stopButton} onPress={pauseRecording}>
                      <IconPlayerPause size={32} color="#FFFFFF" />
                    </Pressable>
                  </Animated.View>
                ) : (
                  <Pressable
                    style={styles.recordButton}
                    onPress={isPaused ? resumeRecording : startRecording}
                  >
                    <IconMicrophone size={32} color="#FFFFFF" />
                  </Pressable>
                )}
                <View style={styles.belowButton}>
                  {isRecording && !isPaused ? (
                    <>
                      <SoundWave isRecording={true} />
                      <Text style={styles.recordingDuration}>
                        {formatDuration(recordingDuration)}
                      </Text>
                    </>
                  ) : isPaused ? (
                    <>
                      <Text style={styles.recordingDuration}>
                        {formatDuration(recordingDuration)}
                      </Text>
                      <Pressable style={styles.discardButton} onPress={discardRecording}>
                        <IconTrash size={18} color={colors.error} />
                        <Text style={styles.deleteText}>Delete & start over</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text style={styles.recordHint}>Tap to start recording</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              disabled={isRecording}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable
              style={[
                styles.nextButton,
                (!canProceed && !isPaused || (isRecording && !isPaused)) && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed && !isPaused || (isRecording && !isPaused)}
            >
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? "Done" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={showTranscript}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTranscript(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{currentQuestion?.category}</Text>
            <Pressable onPress={() => setShowTranscript(false)}>
              <IconX size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTranscript}>
              {existingRecording?.transcription || "No transcript available yet."}
            </Text>
          </ScrollView>
        </View>
      </Modal>
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerLeft: {
    width: 36,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  questionText: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
    lineHeight: 36,
    marginBottom: spacing["2xl"],
  },
  recordingArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readyState: {
    alignItems: "center",
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  recordHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  recordingState: {
    alignItems: "center",
  },
  belowButton: {
    height: 140,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  stopButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  soundWave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 60,
    marginBottom: spacing.md,
  },
  soundBar: {
    width: 6,
    backgroundColor: colors.error,
    borderRadius: 3,
    minHeight: 8,
  },
  recordingDuration: {
    fontSize: fontSizes["3xl"],
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recordingHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  recordedState: {
    alignItems: "center",
  },
  recordedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.text,
    marginBottom: spacing.lg,
  },
  recordedDuration: {
    fontSize: fontSizes["2xl"],
    fontWeight: "700",
    color: colors.text,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteText: {
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: "500",
  },
  discardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  transcriptLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  transcriptLinkText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.xl,
  },
  modalTranscript: {
    fontSize: fontSizes.base,
    color: colors.text,
    lineHeight: 24,
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
  nextButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  celebrationContainer: {
    flex: 1,
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
  checkmarkList: {
    marginTop: spacing.lg,
    gap: 9,
    paddingHorizontal: spacing.xl,
  },
  checkmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkmarkText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: 26,
    flexShrink: 1,
  },
});
