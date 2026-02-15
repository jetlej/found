import { AppHeader } from "@/components/AppHeader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ShareableProfileCard } from "@/components/ShareableProfileCard";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { useQuery } from "convex/react";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export default function HomeScreen() {
  const userId = useEffectiveUserId();
  const cardRef = useRef<View>(null);

  const fadeOpacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  useEffect(() => {
    SplashScreen.hideAsync();
    fadeOpacity.value = withTiming(1, { duration: 350 });
  }, []);

  const { isOnline, setOnline, setCachedUser } = useOfflineStore();

  const currentUser = useQuery(api.users.current, userId ? {} : "skip");

  const myProfile = useQuery(
    api.userProfiles.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  const firstPhotoUrl =
    userPhotos?.sort((a, b) => a.order - b.order)[0]?.url || null;

  useEffect(() => {
    if (currentUser && currentUser._id) {
      setCachedUser({
        _id: currentUser._id,
        clerkId: currentUser.clerkId,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
      });
      if (!isOnline) setOnline(true);
    }
  }, [currentUser?._id, currentUser?.name, currentUser?.avatarUrl]);

  // Countdown
  const [countdown, setCountdown] = useState({ days: 10, hours: 0, minutes: 0, seconds: 0 });
  const [countdownEnd] = useState(() => Date.now() + TEN_DAYS_MS);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, countdownEnd - Date.now());
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [countdownEnd]);

  const handleShareReferral = async () => {
    try {
      const code = currentUser?.referralCode ?? "FOUND";
      await Share.share({
        message: `Join me on Found - the dating app that actually works. Use my code ${code} when you sign up! Download: https://found.app`,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  const handleShareProfile = async () => {
    try {
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await Share.share(
        Platform.OS === "ios" ? { url: uri } : { message: uri },
      );
    } catch (err) {
      console.error("Share profile error:", err);
    }
  };

  const hasProfile = currentUser && myProfile?.generatedBio;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <OfflineBanner />
        <AppHeader />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasProfile ? (
            <>
              <ShareableProfileCard
                ref={cardRef}
                user={currentUser}
                profile={myProfile}
                photoUrl={firstPhotoUrl}
              />

              <Pressable style={styles.shareButton} onPress={handleShareProfile}>
                <Text style={styles.shareButtonText}>Share Profile</Text>
              </Pressable>
            </>
          ) : currentUser ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={styles.loadingText}>
                Building your profile...
              </Text>
            </View>
          ) : null}

          {/* Waitlist info below the card */}
          <View style={styles.waitlistSection}>
            <Text style={styles.waitlistTitle}>You're on the waitlist</Text>

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

            <Pressable onPress={handleShareReferral}>
              <Text style={styles.referralLink}>
                Skip the wait — share your referral code
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  shareButtonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: "600",
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing["3xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  waitlistSection: {
    alignItems: "center",
    marginTop: spacing["2xl"],
    paddingTop: spacing["2xl"],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  waitlistTitle: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countdownItem: {
    alignItems: "center",
    minWidth: 44,
  },
  countdownNumber: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xl,
    color: colors.text,
  },
  countdownUnit: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: -4,
  },
  countdownSeparator: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  referralLink: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textDecorationLine: "underline",
    marginTop: spacing.lg,
  },
});
