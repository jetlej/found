import { PhotoGrid } from '@/components/PhotoGrid';
import { api } from '@/convex/_generated/api';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useScreenReady } from '@/hooks/useScreenReady';
import { getNextStep, goToNextStep } from '@/lib/onboarding-flow';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export default function PhotosScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === 'true';

  const currentUser = useQuery(api.users.current, userId ? {} : 'skip');
  const existingPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );

  const setOnboardingStep = useMutation(api.users.setOnboardingStep);
  const completeCategory = useMutation(api.users.completeCategory);

  // Screen ready state for smooth fade-in from splash
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  // Mark screen as ready immediately (photos load async but we show UI right away)
  useEffect(() => {
    setScreenReady(true);
  }, []);

  const [photoCount, setPhotoCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isValid = photoCount >= 4;

  const handleContinue = async () => {
    if (!userId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        router.back();
      } else {
        const nextStep = getNextStep('photos');
        if (nextStep) {
          await setOnboardingStep({ step: nextStep });
          goToNextStep(router, 'photos');
        } else {
          // Last step — complete the basics category and exit
          await completeCategory({ categoryId: 'the_basics' });
          router.replace('/(tabs)/questions');
        }
      }
    } catch (error) {
      console.error('Error continuing onboarding:', error);
      setIsSubmitting(false);
    }
  };

  if (!currentUser?._id) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        {isEditing && (
          <View style={styles.closeHeader}>
            <Pressable style={styles.closeButton} onPress={() => router.back()}>
              <IconChevronLeft size={28} color={colors.text} />
            </Pressable>
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.stepContent}>
            <Text style={styles.title}>Add your photos</Text>
            <Text style={styles.subtitle}>
              Add at least 4 photos to continue. Hold and drag to reorder.
            </Text>
          </View>

          <PhotoGrid
            userId={currentUser._id}
            existingPhotos={existingPhotos}
            showRequired={true}
            onPhotoCountChange={setPhotoCount}
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.button, (!isValid || isSubmitting) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>{isEditing ? 'Save' : 'Continue'}</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  closeHeader: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
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
  stepContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes['3xl'],
    marginBottom: spacing.sm,
  },
});
