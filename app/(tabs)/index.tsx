import { AppHeader } from "@/components/AppHeader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { api } from "@/convex/_generated/api";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Hardcoded 10 days countdown
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export default function HomeScreen() {
  const { userId } = useAuth();

  const fadeOpacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  useEffect(() => {
    SplashScreen.hideAsync();
    fadeOpacity.value = withTiming(1, { duration: 350 });
  }, []);

  const { isOnline, setOnline, setCachedUser } = useOfflineStore();

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
      });

      if (!isOnline) {
        setOnline(true);
      }
    }
  }, [currentUser?._id, currentUser?.name, currentUser?.avatarUrl]);

  // Countdown timer - hardcoded to 10 days from now
  const [countdown, setCountdown] = useState({ days: 10, hours: 0, minutes: 0, seconds: 0 });
  const [countdownEnd] = useState(() => Date.now() + TEN_DAYS_MS);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, countdownEnd - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [countdownEnd]);

  const handleShare = async () => {
    try {
      const code = currentUser?.referralCode ?? "FOUND";
      await Share.share({
        message: `Join me on Found - the dating app that actually works. Use my code ${code} when you sign up! Download: https://found.app`,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <OfflineBanner />
        <AppHeader />

        <View style={styles.content}>
          <Text style={styles.title}>You're on the waitlist</Text>
          <Text style={styles.subtitle}>You have two options:</Text>

          {/* Option A: Refer */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>A</Text>
              </View>
              <Text style={styles.optionTitle}>Refer a friend to skip the wait</Text>
            </View>
            <Pressable
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>Share referral code</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Option B: Wait */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>B</Text>
              </View>
              <Text style={styles.optionTitle}>Wait your turn</Text>
            </View>
            <View style={styles.countdownRow}>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownNumber}>{countdown.days}</Text>
                <Text style={styles.countdownUnit}>days</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownNumber}>
                  {countdown.hours.toString().padStart(2, "0")}
                </Text>
                <Text style={styles.countdownUnit}>hours</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownNumber}>
                  {countdown.minutes.toString().padStart(2, "0")}
                </Text>
                <Text style={styles.countdownUnit}>min</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownNumber}>
                  {countdown.seconds.toString().padStart(2, "0")}
                </Text>
                <Text style={styles.countdownUnit}>sec</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.xl,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing["3xl"],
  },
  optionSection: {
    alignItems: "center",
    width: "100%",
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  optionBadgeText: {
    color: "#FFFFFF",
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  optionTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xl,
    color: colors.text,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countdownItem: {
    alignItems: "center",
    minWidth: 50,
  },
  countdownNumber: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
  countdownUnit: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: -4,
  },
  countdownSeparator: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.xl,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing["2xl"],
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#AAAAAA",
  },
  dividerText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  shareButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing["2xl"],
    alignItems: "center",
    maxWidth: 220,
    width: "100%",
  },
  shareButtonText: {
    color: colors.surface,
    fontSize: fontSizes.base,
    fontWeight: "600",
  },
});
