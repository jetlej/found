import { ShareableProfileCard } from "@/components/ShareableProfileCard";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function MiniProfileScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const cardRef = useRef<View>(null);

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

  const [capturing, setCapturing] = useState(false);

  const handleShare = async () => {
    try {
      setCapturing(true);
      await new Promise((r) => setTimeout(r, 50));
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      setCapturing(false);
      await Share.share(
        Platform.OS === "ios" ? { url: uri } : { message: uri },
      );
    } catch (err) {
      setCapturing(false);
      console.error("Share profile error:", err);
    }
  };

  const hasProfile = currentUser && myProfile?.generatedBio;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasProfile ? (
          <ShareableProfileCard
            ref={cardRef}
            user={currentUser}
            profile={myProfile}
            photoUrl={firstPhotoUrl}
            variant="fullPage"
            capturing={capturing}
            onClose={() => router.back()}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        )}
      </ScrollView>

      {hasProfile && (
        <View style={styles.floatingBar}>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Profile</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingBottom: 80,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing["4xl"],
  },
  floatingBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  shareButtonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: "600",
  },
});
