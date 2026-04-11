import { api } from '@/convex/_generated/api';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { TOTAL_VOICE_QUESTIONS, VOICE_QUESTIONS } from '@/lib/voice-questions';
import {
  IconCheck,
  IconMicrophone,
  IconPencil,
  IconPlayerPause,
  IconTrash,
  IconX,
} from '@tabler/icons-react-native';
import { useMutation, useQuery } from 'convex/react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Sound wave visualization component using reanimated for smooth 60fps
const NUM_BARS = 7;

function SoundWave({ isRecording }: { isRecording: boolean }) {
  const bars = Array(NUM_BARS)
    .fill(0)
    /* eslint-disable react-hooks/rules-of-hooks -- constant-length array, safe to use hooks in .map() */
    .map((_, i) => {
      const height = useSharedValue(8);

      useEffect(() => {
        if (isRecording) {
          const duration = 150 + Math.random() * 100;

          height.value = withRepeat(
            withSequence(
              withTiming(20 + Math.random() * 40, { duration }),
              withTiming(8 + Math.random() * 15, { duration })
            ),
            -1,
            true
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
  /* eslint-enable react-hooks/rules-of-hooks */

  return <View style={styles.soundWave}>{bars}</View>;
}

export default function VoiceQuestionsScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const params = useLocalSearchParams<{ startIndex?: string }>();
  const startIndex = parseInt(params.startIndex || '0', 10);

  const currentUser = useQuery(api.users.current, userId ? {} : 'skip');
  const recordings = useQuery(
    api.voiceRecordings.getRecordingsForUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );
  const saveRecording = useMutation(api.voiceRecordings.saveRecording);
  const appendToRecording = useMutation(api.voiceRecordings.appendToRecording);
  const deleteRecordingMutation = useMutation(api.voiceRecordings.deleteRecording);
  const updateTranscription = useMutation(api.voiceRecordings.updateTranscription);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [transcriptDirty, setTranscriptDirty] = useState(false);

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
      progressWidth.value = withTiming((currentIndex + 1) / TOTAL_VOICE_QUESTIONS, {
        duration: 300,
      });
    }
  }, [currentIndex]);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false
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
        staysActiveInBackground: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      activateKeepAwakeAsync('recording');

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to begin recording:', err);
    }
  };

  const startRecording = async () => {
    try {
      const { status: existingStatus } = await Audio.getPermissionsAsync();

      if (existingStatus === 'granted') {
        await beginRecording();
      } else {
        const { granted } = await Audio.requestPermissionsAsync();
        if (granted) {
          // Brief pause lets iOS audio session settle after permission grant
          await new Promise((r) => setTimeout(r, 300));
          await beginRecording();
        } else {
          console.error('Audio permission not granted');
        }
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
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
    deactivateKeepAwake('recording');

    const recording = recordingRef.current;
    recordingRef.current = null;
    const questionIdx = currentIndex;
    const shouldAppend = isAppending;
    setIsAppending(false);

    try {
      const status = await recording.getStatusAsync();
      const finalDuration =
        status.isLoaded && status.durationMillis
          ? Math.round(status.durationMillis / 1000)
          : recordingDuration;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri || !currentUser?._id) return;

      (async () => {
        try {
          const uploadUrl = await generateUploadUrl();
          const resp = await fetch(uri, { method: 'GET' });
          const blob = await resp.blob();
          const uploadResp = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': blob.type || 'audio/m4a' },
            body: blob,
          });
          const { storageId } = await uploadResp.json();
          if (shouldAppend) {
            await appendToRecording({
              questionIndex: questionIdx,
              storageId,
              durationSeconds: finalDuration,
            });
          } else {
            await saveRecording({
              questionIndex: questionIdx,
              storageId,
              durationSeconds: finalDuration,
            });
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
          console.error('Failed to upload recording:', err);
        }
      })();
    } catch (err) {
      console.error('Failed to stop recording:', err);
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
    setIsAppending(false);
    setRecordingDuration(0);
    deactivateKeepAwake('recording');
  };

  const startAppending = async () => {
    setIsAppending(true);
    await startRecording();
  };

  const handleEditOption = (option: 'record' | 'transcript' | 'startOver') => {
    setShowEditMenu(false);
    if (option === 'record') startAppending();
    else if (option === 'transcript') {
      setEditedTranscript(existingRecording?.transcription || '');
      setTranscriptDirty(false);
      setShowTranscript(true);
    } else handleDelete();
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
      console.error('Failed to delete recording:', err);
    }
  };

  const handleNext = useCallback(() => {
    if (isPaused && recordingRef.current) {
      stopRecording();
    }
    setShowTranscript(false);
    if (isLastQuestion) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/questions');
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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
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
          <View style={styles.questionContainer}>
            {currentQuestion.text.includes('\n\n') ? (
              <View style={styles.questionTextGroup}>
                {currentQuestion.text.split('\n\n').map((part, i) => (
                  <Text key={i} style={styles.questionTextPart}>
                    {part}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.questionText}>{currentQuestion.text}</Text>
            )}
          </View>

          <View style={styles.recordingArea}>
            {hasRecording && !isRecording ? (
              <View style={styles.recordedState}>
                <View style={styles.recordedBadge}>
                  <IconCheck size={24} color={colors.success} />
                  <Text style={styles.recordedDuration}>
                    {formatDuration(existingRecording.durationSeconds)}
                  </Text>
                </View>
                <Pressable style={styles.editLink} onPress={() => setShowEditMenu(true)}>
                  <IconPencil size={14} color={colors.textSecondary} />
                  <Text style={styles.editLinkText}>Edit</Text>
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
            <Pressable style={styles.backButton} onPress={handleBack} disabled={isRecording}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable
              style={[
                styles.nextButton,
                ((!canProceed && !isPaused) || (isRecording && !isPaused)) && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={(!canProceed && !isPaused) || (isRecording && !isPaused)}
            >
              <Text style={styles.nextButtonText}>{isLastQuestion ? 'Done' : 'Next'}</Text>
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
        <SafeAreaView style={styles.modalContent} edges={['bottom']}>
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {existingRecording?.transcription != null ? (
              <TextInput
                style={styles.modalTranscript}
                value={editedTranscript}
                onChangeText={(text) => {
                  setEditedTranscript(text);
                  setTranscriptDirty(text !== existingRecording.transcription);
                }}
                multiline
                scrollEnabled={false}
              />
            ) : (
              <Text style={[styles.modalTranscript, { color: colors.textMuted }]}>
                No transcript available yet.
              </Text>
            )}
          </ScrollView>
          <View style={styles.modalFooter}>
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.backButton}
                onPress={() => {
                  setEditedTranscript(existingRecording?.transcription || '');
                  setTranscriptDirty(false);
                  setShowTranscript(false);
                }}
              >
                <Text style={styles.backButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.nextButton, !transcriptDirty && styles.buttonDisabled]}
                disabled={!transcriptDirty}
                onPress={async () => {
                  if (!existingRecording) return;
                  await updateTranscription({
                    recordingId: existingRecording._id,
                    transcription: editedTranscript,
                  });
                  setTranscriptDirty(false);
                  setShowTranscript(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={styles.nextButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showEditMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditMenu(false)}
      >
        <Pressable style={styles.editMenuOverlay} onPress={() => setShowEditMenu(false)}>
          <View style={styles.editMenuCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.editMenuTitle}>Edit answer</Text>
            <Pressable style={styles.editMenuOption} onPress={() => handleEditOption('record')}>
              <IconMicrophone size={20} color={colors.text} />
              <Text style={styles.editMenuOptionText}>Record more</Text>
            </Pressable>
            <Pressable style={styles.editMenuOption} onPress={() => handleEditOption('transcript')}>
              <IconPencil size={20} color={colors.text} />
              <Text style={styles.editMenuOptionText}>Edit transcript</Text>
            </Pressable>
            <Pressable style={styles.editMenuOption} onPress={() => handleEditOption('startOver')}>
              <IconTrash size={20} color={colors.error} />
              <Text style={[styles.editMenuOptionText, { color: colors.error }]}>Start over</Text>
            </Pressable>
            <Pressable style={styles.editMenuCancel} onPress={() => setShowEditMenu(false)}>
              <Text style={styles.editMenuCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: spacing.lg,
  },
  backButtonText: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  belowButton: {
    alignItems: 'center',
    height: 140,
    justifyContent: 'flex-start',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  categoryLabel: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    textAlign: 'center',
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  editLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  editLinkText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  editMenuCancel: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  editMenuCancelText: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  editMenuCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    width: '80%',
  },
  editMenuOption: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  editMenuOptionText: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '500',
  },
  editMenuOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  editMenuTitle: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    marginBottom: spacing.md,
  },
  deleteText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  discardButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  header: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  headerLeft: {
    width: 36,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalContent: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 3,
    height: 5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    width: 36,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  modalFooter: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.xl,
  },
  modalTitle: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
  },
  modalTranscript: {
    color: colors.text,
    fontSize: fontSizes.base,
    lineHeight: 24,
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 2,
    padding: spacing.lg,
  },
  nextButtonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  progressBar: {
    backgroundColor: colors.border,
    borderRadius: 2,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: '100%',
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  questionContainer: {
    marginBottom: spacing['2xl'],
    minHeight: 140,
  },
  questionText: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes['2xl'],
    lineHeight: 36,
  },
  questionTextGroup: {
    gap: spacing.sm,
  },
  questionTextPart: {
    color: colors.text,
    fontFamily: fonts.serifBold,
    fontSize: fontSizes['2xl'],
    lineHeight: 36,
  },
  readyState: {
    alignItems: 'center',
  },
  recordButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 50,
    height: 100,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 100,
  },
  recordHint: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  recordedBadge: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  recordedDuration: {
    color: '#FFFFFF',
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
  },
  recordedState: {
    alignItems: 'center',
  },
  recordingArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  recordingDuration: {
    color: colors.text,
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  recordingHint: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  recordingState: {
    alignItems: 'center',
  },
  soundBar: {
    backgroundColor: colors.error,
    borderRadius: 3,
    minHeight: 8,
    width: 6,
  },
  soundWave: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stopButton: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 50,
    height: 100,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 100,
  },
});
