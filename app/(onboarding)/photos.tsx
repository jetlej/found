import { PhotoGrid } from "@/components/PhotoGrid";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PhotosScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();

  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip",
  );
  const existingPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

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
      // Complete the_basics category (Level 1) and mark onboarding complete
      await completeCategory({ clerkId: userId, categoryId: "the_basics" });
      // Navigate to main tabs (journey tab)
      router.replace("/(tabs)/questions");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setIsSubmitting(false);
    }
  };

  if (!currentUser?._id) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
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
            style={[
              styles.button,
              (!isValid || isSubmitting) && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
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
  content: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
