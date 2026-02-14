import { AppHeader } from "@/components/AppHeader";
import { JourneyPath } from "@/components/JourneyPath";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { CATEGORIES } from "@/lib/categories";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JourneyScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const params = useLocalSearchParams<{ completed?: string }>();
  const [justCompletedCategoryId, setJustCompletedCategoryId] = useState<
    string | null
  >(null);

  const fadeOpacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  useEffect(() => {
    SplashScreen.hideAsync();
    fadeOpacity.value = withTiming(1, { duration: 350 });
  }, []);

  // Handle completed param for animation - set ID immediately to prevent flash
  useEffect(() => {
    if (params.completed) {
      // Set immediately so UI shows "animating" state right away (no flash)
      setJustCompletedCategoryId(params.completed);
      // Clear the URL param
      router.setParams({ completed: undefined });
    }
  }, [params.completed]);

  // Clear animation state after animation completes
  const handleAnimationComplete = () => {
    setJustCompletedCategoryId(null);
  };

  // Test mutations (dev only)
  const completeCategory = useMutation(api.users.completeCategory);
  const uncompleteCategory = useMutation(api.users.uncompleteCategory);
  const resetJourney = useMutation(api.users.resetJourney);

  const handleTestComplete = async (categoryId: string) => {
    if (!userId) return;
    await completeCategory({ categoryId });
    setJustCompletedCategoryId(categoryId);
  };

  const handleTestUncomplete = async (categoryId: string) => {
    if (!userId) return;
    await uncompleteCategory({ categoryId });
  };

  const handleResetJourney = async () => {
    if (!userId) return;
    await resetJourney({});
    setJustCompletedCategoryId(null);
  };

  const currentUser = useQuery(
    api.users.current,
    userId ? {} : "skip",
  );

  const level = currentUser?.level ?? 1;
  const completedCategories = currentUser?.completedCategories ?? [
    "the_basics",
  ];

  // Find the current (next uncompleted) category
  const currentCategory = useMemo(() => {
    return CATEGORIES.find((c) => !completedCategories.includes(c.id));
  }, [completedCategories]);

  // Get answered count for current category
  const currentCategoryAnsweredCount = useQuery(
    api.answers.countByUserForCategory,
    currentUser?._id && currentCategory
      ? {
          userId: currentUser._id,
          questionOrderStart: currentCategory.questionRange[0],
          questionOrderEnd: currentCategory.questionRange[1],
        }
      : "skip",
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <AppHeader
          showLevelLink={false}
          onLogoPress={__DEV__ ? handleResetJourney : undefined}
        />
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            The more questions you answer, the higher your level, and the more
            compatibility scores you unlock.
          </Text>
        </View>
        <JourneyPath
          completedCategories={completedCategories}
          currentLevel={level}
          currentCategoryAnsweredCount={currentCategoryAnsweredCount ?? 0}
          justCompletedCategoryId={justCompletedCategoryId}
          onAnimationComplete={handleAnimationComplete}
          onTestComplete={handleTestComplete}
          onTestUncomplete={handleTestUncomplete}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  description: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  descriptionText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
