import { OfflineBanner } from "@/components/OfflineBanner";
import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { userId } = useAuth();
  const router = useRouter();

  const fadeOpacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  useEffect(() => {
    // Hide splash screen and start fade-in
    SplashScreen.hideAsync();
    fadeOpacity.value = withTiming(1, { duration: 350 });
  }, []);

  const { isOnline, setOnline, cachedUser, setCachedUser } = useOfflineStore();

  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip"
  );

  useEffect(() => {
    if (currentUser && currentUser._id) {
      setCachedUser({
        _id: currentUser._id,
        clerkId: currentUser.clerkId,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
        onboardingComplete: currentUser.onboardingComplete,
      });

      if (!isOnline) {
        setOnline(true);
      }
    }
  }, [currentUser?._id, currentUser?.name, currentUser?.avatarUrl]);

  const effectiveUser = currentUser ?? cachedUser;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <OfflineBanner />

        <View style={styles.header}>
          <Text style={styles.logo}>Found</Text>
          <Pressable
            onPress={() => router.push("/profile")}
            style={styles.headerAvatar}
          >
            {effectiveUser?.avatarUrl ? (
              <Image
                source={{ uri: effectiveUser.avatarUrl }}
                style={styles.headerAvatarImage}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarInitial}>
                  {effectiveUser?.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>You're on the waitlist!</Text>
          <Text style={styles.subtitle}>
            We're working hard to find your perfect matches.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardEmoji}>💝</Text>
            <Text style={styles.cardTitle}>Matching Coming Soon</Text>
            <Text style={styles.cardText}>
              We'll notify you when it's your turn to start meeting people who truly get you.
            </Text>
          </View>

          {currentUser?.waitlistPosition && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionLabel}>Your position</Text>
              <Text style={styles.positionNumber}>#{currentUser.waitlistPosition}</Text>
            </View>
          )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  logo: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
    letterSpacing: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerAvatarInitial: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing["2xl"],
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    marginBottom: spacing.xl,
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  positionBadge: {
    alignItems: "center",
  },
  positionLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  positionNumber: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
});
