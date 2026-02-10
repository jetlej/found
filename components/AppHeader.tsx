import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { IconBoltFilled } from "@tabler/icons-react-native";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface AppHeaderProps {
  showLevelLink?: boolean; // Whether tapping level navigates to journey
  onLogoPress?: () => void;
}

export function AppHeader({
  showLevelLink = true,
  onLogoPress,
}: AppHeaderProps) {
  const userId = useEffectiveUserId();
  const router = useRouter();

  const currentUser = useQuery(
    api.users.current,
    userId ? { clerkId: userId } : "skip",
  );

  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  const firstPhotoUrl =
    userPhotos?.sort((a, b) => a.order - b.order)[0]?.url || null;

  const level = Math.max(1, currentUser?.completedCategories?.length ?? 0);

  const handleLevelPress = () => {
    if (showLevelLink) {
      router.push("/(tabs)/journey");
    }
  };

  return (
    <View style={styles.header}>
      {/* Level badge hidden for now — keep code for future use */}
      <View style={styles.headerLeft} />
      {onLogoPress ? (
        <Pressable onPress={onLogoPress}>
          <Text style={styles.logo}>Found.</Text>
        </Pressable>
      ) : (
        <Text style={styles.logo}>Found.</Text>
      )}
      <View style={styles.headerRight}>
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.headerAvatar}
        >
          {firstPhotoUrl ? (
            <Image
              source={{ uri: firstPhotoUrl }}
              style={styles.headerAvatarImage}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {currentUser?.name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  logo: {
    fontFamily: fonts.logo,
    fontSize: fontSizes["2xl"],
    color: colors.text,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  levelText: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
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
});
