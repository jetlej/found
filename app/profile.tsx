import { PhotoGrid } from '@/components/PhotoGrid';
import { api } from '@/convex/_generated/api';
import {
  cancelDailyReminder,
  hasNotificationPermission,
  promptForNotifications,
  scheduleDailyReminder,
} from '@/hooks/usePushNotifications';
import { colors, fonts, fontSizes, spacing, textStyles } from '@/lib/theme';
import { useOfflineStore } from '@/stores/offline';
import { useAuth, useUser } from '@clerk/clerk-expo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconChevronRight, IconPencil } from '@tabler/icons-react-native';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { signOut, userId: clerkUserId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { devClerkId } = useOfflineStore();

  // Use dev clerkId when impersonating
  const userId = __DEV__ && devClerkId ? devClerkId : clerkUserId;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  const currentUser = useQuery(api.users.current, userId ? {} : 'skip');

  const updateProfile = useMutation(api.users.updateProfile);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);

  // Get user's photos
  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );

  // Get first photo URL (sorted by order)
  const firstPhotoUrl = userPhotos?.sort((a, b) => a.order - b.order)[0]?.url || null;

  const notificationsEnabled = currentUser?.notificationsEnabled ?? false;
  const reminderHour = currentUser?.reminderHour ?? 12;
  const reminderMinute = currentUser?.reminderMinute ?? 0;

  useEffect(() => {
    async function checkSystemPermission() {
      if (!userId || !currentUser?.notificationsEnabled) return;

      const hasPermission = await hasNotificationPermission();
      if (!hasPermission) {
        await updateNotifications({
          notificationsEnabled: false,
        });
        await cancelDailyReminder();
      }
    }
    checkSystemPermission();
  }, [userId, currentUser?.notificationsEnabled]);

  const handleEditName = () => {
    setEditedName(currentUser?.name ?? '');
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
    setEditedName('');
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!userId) return;
    setIsSavingNotifications(true);

    try {
      if (enabled) {
        const hasPermission = await hasNotificationPermission();

        if (hasPermission) {
          await scheduleDailyReminder(reminderHour, reminderMinute);
          await updateNotifications({
            notificationsEnabled: true,
          });
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
              'Notifications Disabled',
              'To enable daily reminders, please allow notifications in your device settings.',
              [
                { text: 'Not Now', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
          }
        }
      } else {
        await cancelDailyReminder();
        await updateNotifications({
          notificationsEnabled: false,
        });
      }
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    if (selectedDate && userId) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();

      setShowTimePicker(false);
      setIsSavingNotifications(true);

      try {
        if (notificationsEnabled) {
          await scheduleDailyReminder(hour, minute);
        }

        await updateNotifications({
          reminderHour: hour,
          reminderMinute: minute,
        });
      } finally {
        setIsSavingNotifications(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const reminderDate = new Date();
  reminderDate.setHours(reminderHour, reminderMinute, 0, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Pressable style={styles.avatarContainer} onPress={() => setShowPhotoEditor(true)}>
            {firstPhotoUrl ? (
              <Image source={{ uri: firstPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
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
                      <Text
                        style={[styles.saveText, !editedName.trim() && styles.saveTextDisabled]}
                      >
                        Save
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ) : (
            <Pressable onPress={handleEditName} style={styles.nameRow}>
              <Text style={styles.name}>{currentUser?.name ?? 'User'}</Text>
              <IconPencil size={16} color={colors.textMuted} style={styles.pencilIcon} />
            </Pressable>
          )}
          <Text style={styles.phone}>{user?.phoneNumbers?.[0]?.phoneNumber}</Text>
        </View>

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
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              textColor={colors.text}
              themeVariant="light"
            />
          </View>
        </View>
      )}

      {/* Photo Editor Modal */}
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
              <PhotoGrid
                userId={currentUser._id}
                existingPhotos={userPhotos}
                showRequired={false}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.border,
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarInitial: {
    color: colors.text,
    fontSize: fontSizes['2xl'],
    fontWeight: '600',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: 40,
    borderWidth: 1,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  closeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeIcon: {
    color: colors.textMuted,
    fontSize: 20,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  editActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.background,
    borderRadius: 14,
    borderWidth: 2,
    bottom: 0,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 28,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
    paddingVertical: spacing['2xl'],
  },
  menuArrow: {
    color: colors.textMuted,
    fontSize: fontSizes.base,
  },
  menuItem: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  menuText: {
    color: colors.text,
    fontSize: fontSizes.base,
  },
  modalContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  modalDoneButton: {
    alignItems: 'flex-end',
    width: 60,
  },
  modalDoneText: {
    color: colors.primary,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
  modalTitle: { ...textStyles.pageTitle },
  name: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '600',
  },
  nameEditActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  nameEditContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    borderBottomColor: colors.success,
    borderBottomWidth: 1,
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '600',
    minWidth: 150,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navTitle: { ...textStyles.pageTitle },
  notificationHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  notificationInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  notificationRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  pencilIcon: {
    marginTop: 2,
  },
  phone: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  saveText: {
    color: colors.success,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    marginTop: spacing['3xl'],
    paddingVertical: spacing.md,
  },
  signOutText: {
    color: colors.error,
    fontSize: fontSizes.base,
    fontWeight: '500',
  },
  timeDisplay: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timePickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  timePickerDone: {
    color: colors.success,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  timePickerHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  timePickerOverlay: {
    backgroundColor: colors.overlay,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  timePickerTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  timeText: {
    color: colors.success,
    fontSize: fontSizes.base,
  },
  version: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: spacing['3xl'],
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
