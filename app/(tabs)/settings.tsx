import { PhotoGrid } from "@/components/PhotoGrid";
import { api } from "@/convex/_generated/api";
import { TOTAL_VOICE_QUESTIONS } from "@/lib/voice-questions";
import {
  cancelDailyReminder,
  hasNotificationPermission,
  promptForNotifications,
  scheduleDailyReminder,
} from "@/hooks/usePushNotifications";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { useAuth, useUser } from "@clerk/clerk-expo";
import DateTimePicker from "@react-native-community/datetimepicker";
import { IconChevronRight, IconPencil } from "@tabler/icons-react-native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { signOut, userId: clerkUserId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { devClerkId } = useOfflineStore();

  const userId = __DEV__ && devClerkId ? devClerkId : clerkUserId;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  const currentUser = useQuery(api.users.current, userId ? {} : "skip");

  // Fade in once data is ready
  const fadeOpacity = useSharedValue(0);
  const hasFaded = useRef(false);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  useEffect(() => {
    if (currentUser && !hasFaded.current) {
      hasFaded.current = true;
      fadeOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [currentUser]);

  const updateProfile = useMutation(api.users.updateProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);

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

  const notificationsEnabled = currentUser?.notificationsEnabled ?? false;
  const reminderHour = currentUser?.reminderHour ?? 12;
  const reminderMinute = currentUser?.reminderMinute ?? 0;

  useEffect(() => {
    async function checkSystemPermission() {
      if (!userId || !currentUser?.notificationsEnabled) return;
      const hasPermission = await hasNotificationPermission();
      if (!hasPermission) {
        await updateNotifications({ notificationsEnabled: false });
        await cancelDailyReminder();
      }
    }
    checkSystemPermission();
  }, [userId, currentUser?.notificationsEnabled]);

  const handleEditName = () => {
    setEditedName(currentUser?.name ?? "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!userId || !editedName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ name: editedName.trim() });
      setIsEditingName(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!userId) return;
    setIsSavingNotifications(true);
    try {
      if (enabled) {
        const hasPermission = await hasNotificationPermission();
        if (hasPermission) {
          await scheduleDailyReminder(reminderHour, reminderMinute);
          await updateNotifications({ notificationsEnabled: true });
        } else {
          const { granted, token } = await promptForNotifications();
          if (granted) {
            await updateNotifications({
              notificationsEnabled: true,
              pushToken: token ?? undefined,
              reminderHour: 12,
              reminderMinute: 0,
            });
          } else {
            Alert.alert(
              "Notifications Disabled",
              "To enable daily reminders, please allow notifications in your device settings.",
              [
                { text: "Not Now", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ],
            );
          }
        }
      } else {
        await cancelDailyReminder();
        await updateNotifications({ notificationsEnabled: false });
      }
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed") {
      setShowTimePicker(false);
      return;
    }
    if (selectedDate && userId) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      setShowTimePicker(false);
      setIsSavingNotifications(true);
      try {
        if (notificationsEnabled) await scheduleDailyReminder(hour, minute);
        await updateNotifications({ reminderHour: hour, reminderMinute: minute });
      } finally {
        setIsSavingNotifications(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    // AuthGate handles redirect to landing page once isSignedIn flips
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, "0");
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const reminderDate = new Date();
  reminderDate.setHours(reminderHour, reminderMinute, 0, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <View style={styles.navBar}>
        <View style={styles.navSpacer} />
        <Text style={styles.navTitle}>Settings</Text>
        <View style={styles.navSpacer} />
      </View>

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
          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                maxLength={30}
                placeholder="Enter name"
                placeholderTextColor={colors.textPlaceholder}
              />
              <View style={styles.nameEditActions}>
                {isSaving ? (
                  <ActivityIndicator color={colors.success} size="small" />
                ) : (
                  <>
                    <Pressable onPress={handleCancelEdit} style={styles.editActionButton}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveName}
                      style={styles.editActionButton}
                      disabled={!editedName.trim()}
                    >
                      <Text style={[styles.saveText, !editedName.trim() && styles.saveTextDisabled]}>
                        Save
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ) : (
            <Pressable onPress={handleEditName} style={styles.nameRow}>
              <Text style={styles.name}>{currentUser?.name ?? "User"}</Text>
              <IconPencil size={16} color={colors.textMuted} style={styles.pencilIcon} />
            </Pressable>
          )}
          <Text style={styles.phone}>{user?.phoneNumbers?.[0]?.phoneNumber}</Text>
        </View>

        {/* Profile section -- only shown after voice questions are complete */}
        {questionsComplete && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/my-profile")}
            >
              <Text style={styles.menuText}>View Profile</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push({ pathname: "/(tabs)/questions", params: { editing: "true" } })}
            >
              <Text style={styles.menuText}>Edit Profile</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.menuText}>Daily Reminders</Text>
              <Text style={styles.notificationHint}>Get reminded daily at a set time</Text>
            </View>
            {isSavingNotifications ? (
              <ActivityIndicator color={colors.success} size="small" />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.surface}
              />
            )}
          </View>
          {notificationsEnabled && (
            <Pressable style={styles.notificationRow} onPress={() => setShowTimePicker(true)}>
              <View style={styles.notificationInfo}>
                <Text style={styles.menuText}>Reminder Time</Text>
                <Text style={styles.notificationHint}>When to send daily reminder</Text>
              </View>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>{formatTime(reminderHour, reminderMinute)}</Text>
                <IconChevronRight size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          )}
        </View>

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

        <Text style={styles.version}>v1.0.0</Text>
      </ScrollView>

      </Animated.View>

      {showTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Reminder Time</Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text style={styles.timePickerDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={reminderDate}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
              textColor={colors.text}
              themeVariant="light"
            />
          </View>
        </View>
      )}

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
  scrollView: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navSpacer: { width: 40 },
  navTitle: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.text },
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: fontSizes.xl, fontWeight: "600", color: colors.text },
  pencilIcon: { marginTop: 2 },
  nameEditContainer: { alignItems: "center", gap: spacing.sm },
  nameInput: {
    fontSize: fontSizes.xl, fontWeight: "600", color: colors.text, textAlign: "center",
    borderBottomWidth: 1, borderBottomColor: colors.success,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md, minWidth: 150,
  },
  nameEditActions: { flexDirection: "row", gap: spacing.lg },
  editActionButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  cancelText: { fontSize: fontSizes.sm, color: colors.textMuted },
  saveText: { fontSize: fontSizes.sm, color: colors.success, fontWeight: "600" },
  saveTextDisabled: { opacity: 0.5 },
  phone: { fontSize: fontSizes.sm, color: colors.textMuted },
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
  notificationRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  notificationInfo: { flex: 1, marginRight: spacing.md },
  notificationHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  timeDisplay: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  timeText: { fontSize: fontSizes.base, color: colors.success },
  signOutButton: {
    marginHorizontal: spacing.xl, marginTop: spacing["3xl"], paddingVertical: spacing.md,
    alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.error,
  },
  signOutText: { fontSize: fontSizes.base, fontWeight: "500", color: colors.error },
  version: {
    textAlign: "center", marginTop: spacing.xl, marginBottom: spacing["3xl"],
    fontSize: fontSizes.xs, color: colors.textMuted,
  },
  timePickerOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay },
  timePickerContainer: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  timePickerHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  timePickerTitle: { fontSize: fontSizes.lg, fontWeight: "600", color: colors.text },
  timePickerDone: { fontSize: fontSizes.lg, fontWeight: "600", color: colors.success },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalHeaderSpacer: { width: 60 },
  modalTitle: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.text },
  modalDoneButton: { width: 60, alignItems: "flex-end" },
  modalDoneText: { fontSize: fontSizes.base, fontWeight: "600", color: colors.primary },
  modalContent: { flex: 1, paddingTop: spacing.lg },
  modalSubtitle: {
    fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: "center",
    paddingHorizontal: spacing.xl, marginBottom: spacing.lg, lineHeight: 20,
  },
});
