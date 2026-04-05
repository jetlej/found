import { AppHeader } from '@/components/AppHeader';
import { PhotoGrid } from '@/components/PhotoGrid';
import { api } from '@/convex/_generated/api';
import { hasNotificationPermission, promptForNotifications } from '@/hooks/usePushNotifications';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { TOTAL_VOICE_QUESTIONS } from '@/lib/voice-questions';
import { colors, fonts, fontSizes, spacing, textStyles } from '@/lib/theme';
import { useAuth } from '@clerk/clerk-expo';
import { useIsFocused } from '@react-navigation/native';
import { IconPencil } from '@tabler/icons-react-native';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const userId = useEffectiveUserId();
  const deleteCurrentUserAccount = useMutation(api.users.deleteCurrentUserAccount);
  const updateNotifications = useMutation(api.users.updateNotificationSettings);

  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const versionTapCountRef = useRef(0);
  const versionTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = useQuery(api.users.current, userId ? {} : 'skip');

  // Fade in once data is ready
  const fadeOpacity = useSharedValue(0);
  const hasFaded = useRef(false);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  const isFocused = useIsFocused();
  const isUserLoading = !!userId && currentUser === undefined;
  useEffect(() => {
    if (!isUserLoading && isFocused && !hasFaded.current) {
      hasFaded.current = true;
      fadeOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [isUserLoading, isFocused]);

  const userPhotos = useQuery(
    api.photos.getByUser,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );

  const firstPhotoUrl = userPhotos?.sort((a, b) => a.order - b.order)[0]?.url || null;

  const recordingCount = useQuery(
    api.voiceRecordings.getCompletedCount,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  );
  const questionsComplete = recordingCount !== undefined && recordingCount >= TOTAL_VOICE_QUESTIONS;
  const notificationsEnabled = currentUser?.notificationsEnabled ?? false;
  const [optimisticNotificationsEnabled, setOptimisticNotificationsEnabled] =
    useState(notificationsEnabled);

  useEffect(() => {
    setOptimisticNotificationsEnabled(notificationsEnabled);
  }, [notificationsEnabled]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!userId) return;
    setOptimisticNotificationsEnabled(enabled);
    try {
      if (enabled) {
        const hasPermission = await hasNotificationPermission();
        if (!hasPermission) {
          const { granted, token } = await promptForNotifications();
          if (!granted) {
            setOptimisticNotificationsEnabled(false);
            Alert.alert(
              'Notifications Disabled',
              'To enable notifications later, allow them in your device settings.'
            );
            return;
          }
          await updateNotifications({
            notificationsEnabled: true,
            pushToken: token ?? undefined,
          });
          return;
        }

        await updateNotifications({ notificationsEnabled: true });
      } else {
        await updateNotifications({ notificationsEnabled: false });
      }
    } catch (error) {
      setOptimisticNotificationsEnabled(notificationsEnabled);
      console.error('Failed to update notification settings:', error);
    }
  };

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
    Alert.alert('Delete Account', 'Are you sure?', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: resetVersionTapState,
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCurrentUserAccount({});
            await signOut();
          } catch {
            Alert.alert('Error', 'Could not delete account. Please try again.');
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <AppHeader />

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
            <Text style={styles.name}>{currentUser?.name ?? 'User'}</Text>
          </View>

          {/* Profile section -- only shown after voice questions are complete */}
          {questionsComplete && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Pressable style={styles.menuItem} onPress={() => router.push('/profile-audit')}>
                <Text style={styles.menuText}>My Profile</Text>
                <Text style={styles.menuArrow}>→</Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={() => router.push('/edit-answers')}>
                <Text style={styles.menuText}>Edit Answers</Text>
                <Text style={styles.menuArrow}>→</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.menuItem}>
              <Text style={styles.menuText}>Notifications</Text>
              <Switch
                value={optimisticNotificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
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
  avatar: { backgroundColor: colors.border, borderRadius: 40, height: 80, width: 80 },
  avatarContainer: { position: 'relative' },
  avatarInitial: { color: colors.text, fontSize: fontSizes['2xl'], fontWeight: '600' },
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
  container: { backgroundColor: colors.background, flex: 1 },
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
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  menuArrow: { color: colors.textMuted, fontSize: fontSizes.base },
  menuItem: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  menuText: { color: colors.text, fontSize: fontSizes.base },
  modalContainer: { backgroundColor: colors.background, flex: 1 },
  modalContent: { flex: 1, paddingTop: spacing.lg },
  modalDoneButton: { alignItems: 'flex-end', width: 60 },
  modalDoneText: { color: colors.primary, fontSize: fontSizes.base, fontWeight: '600' },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalHeaderSpacer: { width: 60 },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
  modalTitle: { ...textStyles.pageTitle },
  name: { color: colors.text, fontSize: fontSizes.xl, fontWeight: '600' },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
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
  signOutText: { color: colors.error, fontSize: fontSizes.base, fontWeight: '500' },
  version: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: spacing['3xl'],
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
