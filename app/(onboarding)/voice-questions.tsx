import { api } from "@/convex/_generated/api";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { TOTAL_VOICE_QUESTIONS, VOICE_QUESTIONS } from "@/lib/voice-questions";
import { useAuth } from "@clerk/clerk-expo";
import { IconMicrophone, IconPlayerStop, IconTrash, IconX } from "@tabler/icons-react-native";
import { Audio } from "expo-av";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Sound wave visualization component
const NUM_BARS = 5;

function SoundWave({ levels }: { levels: number[] }) {
  return (
    <View style={styles.soundWave}>
      {levels.map((level, i) => (
        <View
          key={i}
          style={[
            styles.soundBar,
            { height: Math.max(8, level * 60) },
          ]}
        />
      ))}
    </View>
  );
}

export default function VoiceQuestionsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ startIndex?: string }>();
  const startIndex = parseInt(params.startIndex || "0", 10);

  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const recordings = useQuery(
    api.voiceRecordings.getRecordingsForUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );
  const saveRecording = useMutation(api.voiceRecordings.saveRecording);
  const deleteRecording = useMutation(api.voiceRecordings.deleteRecording);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(NUM_BARS).fill(0));

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const meteringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Screen ready state for smooth fade-in
  const { isReady: screenReady, setReady: setScreenReady, fadeAnim } = useScreenReady();

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

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Mark screen as ready when data is loaded
  const dataReady = recordings !== undefined && initialized;
  useEffect(() => {
    if (dataReady && !screenReady) {
      setScreenReady(true);
    }
  }, [dataReady, screenReady]);

  const startRecording = async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.error("Audio permission not granted");
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with metering enabled
      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioLevels(Array(NUM_BARS).fill(0));

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start metering for sound wave
      meteringIntervalRef.current = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              // Metering is in dB, typically -160 to 0
              // Normalize to 0-1 range
              const db = status.metering;
              const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
              
              // Shift levels and add new one
              setAudioLevels((prev) => {
                const newLevels = [...prev.slice(1), normalized];
                return newLevels;
              });
            }
          } catch {
            // Ignore errors during metering
          }
        }
      }, 100);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      // Stop duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop metering
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
        meteringIntervalRef.current = null;
      }

      setIsRecording(false);
      setSaving(true);
      setAudioLevels(Array(NUM_BARS).fill(0));

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri || !currentUser?._id) {
        setSaving(false);
        return;
      }

      // Get final duration
      const finalDuration = recordingDuration;

      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri, { method: "GET" });
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/m4a" },
        body: blob,
      });

      const { storageId } = await uploadResponse.json();

      // Save recording metadata
      await saveRecording({
        userId: currentUser._id,
        questionIndex: currentIndex,
        storageId,
        durationSeconds: finalDuration,
      });

      setSaving(false);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser?._id) return;

    try {
      await deleteRecording({
        userId: currentUser._id,
        questionIndex: currentIndex,
      });
    } catch (err) {
      console.error("Failed to delete recording:", err);
    }
  };

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      // Go back to voice tab
      router.back();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastQuestion, router]);

  const handleBack = useCallback(() => {
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
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
        meteringIntervalRef.current = null;
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
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
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
  const canProceed = hasRecording || saving;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
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
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentIndex + 1) / TOTAL_VOICE_QUESTIONS) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentIndex + 1}/{TOTAL_VOICE_QUESTIONS}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>

          <View style={styles.recordingArea}>
            {isRecording ? (
              // Recording in progress
              <View style={styles.recordingState}>
                <Animated.View
                  style={[
                    styles.recordingPulse,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Pressable style={styles.stopButton} onPress={stopRecording}>
                    <IconPlayerStop size={32} color="#FFFFFF" />
                  </Pressable>
                </Animated.View>
                <SoundWave levels={audioLevels} />
                <Text style={styles.recordingDuration}>
                  {formatDuration(recordingDuration)}
                </Text>
                <Text style={styles.recordingHint}>Tap to stop recording</Text>
              </View>
            ) : hasRecording ? (
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
              </View>
            ) : saving ? (
              // Saving state
              <View style={styles.savingState}>
                <Text style={styles.savingText}>Saving...</Text>
              </View>
            ) : (
              // Ready to record
              <View style={styles.readyState}>
                <Pressable style={styles.recordButton} onPress={startRecording}>
                  <IconMicrophone size={32} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.recordHint}>Tap to start recording</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              disabled={isRecording || saving}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable
              style={[
                styles.nextButton,
                (!canProceed || isRecording) && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed || isRecording}
            >
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? "Done" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
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
    paddingTop: spacing.lg,
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
  recordingPulse: {
    marginBottom: spacing.md,
  },
  stopButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  soundWave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 60,
    marginBottom: spacing.md,
  },
  soundBar: {
    width: 6,
    backgroundColor: colors.error,
    borderRadius: 3,
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
  savingState: {
    alignItems: "center",
  },
  savingText: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
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
});
