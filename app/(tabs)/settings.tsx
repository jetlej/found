import { AppHeader } from "@/components/AppHeader";
import { PhotoGrid } from "@/components/PhotoGrid";
import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { TOTAL_VOICE_QUESTIONS } from "@/lib/voice-questions";
import { colors, fonts, fontSizes, spacing, textStyles } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { IconPencil } from "@tabler/icons-react-native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const userId = useEffectiveUserId();
  const deleteCurrentUserAccount = useMutation(api.users.deleteCurrentUserAccount);

  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const versionTapCountRef = useRef(0);
  const versionTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = useQuery(api.users.current, userId ? {} : "skip");

  // Fade in once data is ready
  const fadeOpacity = useSharedValue(0);
  const hasFaded = useRef(false);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  const isUserLoading = !!userId && currentUser === undefined;
  useEffect(() => {
    if (!isUserLoading && !hasFaded.current) {
      hasFaded.current = true;
      fadeOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [isUserLoading]);

  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );

  const firstPhotoUrl =
    userPhotos?.sort((a, b) => a.order - b.order)[0]?.url || null;

  const recordingCount = useQuery(
    api.voiceRecordings.getCompletedCount,
    currentUser?._id ? { userId: currentUser._id } : "skip",
  );
  const questionsComplete =
    recordingCount !== undefined && recordingCount >= TOTAL_VOICE_QUESTIONS;

  const handleSignOut = async () => {
    await signOut();
  };

  const resetVersionTapState = () => {
    versionTapCountRef.current = 0;
    if (versionTapTimeoutRef.current) {
      clearTimeout(versionTapTimeoutRef.current);
      versionTapTimeoutRef.current = null;
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "Are you sure?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: resetVersionTapState,
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCurrentUserAccount({});
            await signOut();
          } catch {
            Alert.alert("Error", "Could not delete account. Please try again.");
          } finally {
            resetVersionTapState();
          }
        },
      },
    ]);
  };

  const handleVersionPress = () => {
    if (versionTapTimeoutRef.current) {
      clearTimeout(versionTapTimeoutRef.current);
    }

    versionTapCountRef.current += 1;

    if (versionTapCountRef.current >= 5) {
      resetVersionTapState();
      handleDeleteAccount();
      return;
    }

    versionTapTimeoutRef.current = setTimeout(() => {
      resetVersionTapState();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (versionTapTimeoutRef.current) {
        clearTimeout(versionTapTimeoutRef.current);
      }
    };
  }, []);

  if (isUserLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <AppHeader />

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Pressable
            style={styles.avatarContainer}
            onPress={() => setShowPhotoEditor(true)}
          >
            {firstPhotoUrl ? (
              <Image source={{ uri: firstPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <IconPencil size={12} color={colors.primaryText} />
            </View>
          </Pressable>
          <Text style={styles.name}>{currentUser?.name ?? "User"}</Text>
        </View>

        {/* Profile section -- only shown after voice questions are complete */}
        {questionsComplete && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/profile-audit")}
            >
              <Text style={styles.menuText}>My Profile</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/edit-answers")}
            >
              <Text style={styles.menuText}>Edit Answers</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Text style={styles.menuArrow}>→</Text>
          </Pressable>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Text style={styles.menuArrow}>→</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Pressable onPress={handleVersionPress} hitSlop={8}>
          <Text style={styles.version}>v1.0.0</Text>
        </Pressable>
      </ScrollView>

      </Animated.View>

      <Modal
        visible={showPhotoEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPhotoEditor(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderSpacer} />
            <Text style={styles.modalTitle}>Edit Photos</Text>
            <Pressable onPress={() => setShowPhotoEditor(false)} style={styles.modalDoneButton}>
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Hold and drag photos to reorder. Your first photo is your main profile picture.
            </Text>
            {currentUser?._id && (
              <PhotoGrid userId={currentUser._id} existingPhotos={userPhotos} showRequired={false} />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollView: { flex: 1 },
  header: {
    alignItems: "center",
    paddingVertical: spacing["2xl"],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatarContainer: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceSecondary,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border,
  },
  avatarInitial: { fontSize: fontSizes["2xl"], fontWeight: "600", color: colors.text },
  editBadge: {
    position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: colors.background,
  },
  name: { fontSize: fontSizes.xl, fontWeight: "600", color: colors.text },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionTitle: {
    fontSize: fontSizes.xs, fontWeight: "600", color: colors.textMuted,
    textTransform: "uppercase", marginBottom: spacing.md, letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuText: { fontSize: fontSizes.base, color: colors.text },
  menuArrow: { fontSize: fontSizes.base, color: colors.textMuted },
  signOutButton: {
    marginHorizontal: spacing.xl, marginTop: spacing["3xl"], paddingVertical: spacing.md,
    alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.error,
  },
  signOutText: { fontSize: fontSizes.base, fontWeight: "500", color: colors.error },
  version: {
    textAlign: "center", marginTop: spacing.xl, marginBottom: spacing["3xl"],
    fontSize: fontSizes.xs, color: colors.textMuted,
  },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalHeaderSpacer: { width: 60 },
  modalTitle: { ...textStyles.pageTitle },
  modalDoneButton: { width: 60, alignItems: "flex-end" },
  modalDoneText: { fontSize: fontSizes.base, fontWeight: "600", color: colors.primary },
  modalContent: { flex: 1, paddingTop: spacing.lg },
  modalSubtitle: {
    fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: "center",
    paddingHorizontal: spacing.xl, marginBottom: spacing.lg, lineHeight: 20,
  },
});
