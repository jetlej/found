import { api } from '@/convex/_generated/api';
import { TOTAL_VOICE_QUESTIONS } from '@/lib/voice-questions';
import { colors, fontSizes, spacing, borderRadius, textStyles } from '@/lib/theme';
import { useOfflineStore } from '@/stores/offline';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AdminUser = NonNullable<ReturnType<typeof useQuery<typeof api.users.adminListUsers>>>[number];

function getStageLabel(u: AdminUser): { label: string; color: string } {
  if (u.profileAuditCompletedAt) return { label: 'Active', color: colors.success };
  if (u.hasProfile && u.voiceRecordingCount >= TOTAL_VOICE_QUESTIONS)
    return { label: 'Awaiting audit', color: colors.warning };
  if (u.voiceRecordingCount > 0)
    return {
      label: `Voice: ${u.voiceRecordingCount}/${TOTAL_VOICE_QUESTIONS}`,
      color: colors.warning,
    };
  if (u.onboardingComplete) return { label: 'Basics done', color: '#3b82f6' };
  if (u.onboardingStep) return { label: `Basics: ${u.onboardingStep}`, color: '#8b5cf6' };
  return { label: 'Signed up', color: colors.textMuted };
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function FunnelSummary({ users }: { users: AdminUser[] }) {
  const stages = [
    { label: 'Signed up', count: users.length },
    { label: 'Basics done', count: users.filter((u) => u.onboardingComplete).length },
    { label: 'Started voice', count: users.filter((u) => u.voiceRecordingCount > 0).length },
    {
      label: 'Voice done',
      count: users.filter((u) => u.voiceRecordingCount >= TOTAL_VOICE_QUESTIONS).length,
    },
    { label: 'Active', count: users.filter((u) => u.profileAuditCompletedAt).length },
  ];

  return (
    <View style={styles.funnel}>
      {stages.map((s, i) => (
        <View key={s.label} style={styles.funnelStep}>
          <View style={styles.funnelItem}>
            <Text style={styles.funnelCount}>{s.count}</Text>
            <Text style={styles.funnelLabel} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
          {i < stages.length - 1 && <Text style={styles.funnelArrow}>→</Text>}
        </View>
      ))}
    </View>
  );
}

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const stage = getStageLabel(user);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {user.firstPhotoUrl ? (
        <Image source={{ uri: user.firstPhotoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{user.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
      )}

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {user.name || 'No name'}
          </Text>
          <View style={[styles.pill, { backgroundColor: stage.color + '20' }]}>
            <Text style={[styles.pillText, { color: stage.color }]}>{stage.label}</Text>
          </View>
        </View>

        <Text style={styles.rowMeta}>
          Joined {timeAgo(user._creationTime)}
          {user.lastActiveAt ? ` · Active ${timeAgo(user.lastActiveAt)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const { setDevClerkId } = useOfflineStore();

  const users = useQuery(api.users.adminListUsers);

  const handleViewAs = (user: AdminUser) => {
    setDevClerkId(user.clerkId);

    if (user.profileAuditCompletedAt) {
      router.replace('/(tabs)/settings');
    } else if (user.hasProfile && user.voiceRecordingCount >= TOTAL_VOICE_QUESTIONS) {
      router.replace('/profile-audit');
    } else if (user.onboardingComplete) {
      router.replace('/(tabs)/questions');
    } else if (user.onboardingStep) {
      router.replace(`/(onboarding)/${user.onboardingStep}` as any);
    } else {
      router.replace('/(onboarding)/referral' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {users === undefined ? (
          <Text style={styles.loadingText}>Loading users...</Text>
        ) : (
          <>
            <FunnelSummary users={users} />
            <Text style={styles.countText}>{users.length} human users</Text>
            {users.map((u) => (
              <UserRow key={u._id} user={u} onPress={() => handleViewAs(u)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.border,
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  avatarInitial: { color: colors.textSecondary, fontSize: fontSizes.base, fontWeight: '600' },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    width: AVATAR_SIZE,
  },
  backText: { color: colors.primary, fontSize: fontSizes.base },
  container: { backgroundColor: colors.background, flex: 1 },
  countText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  funnel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  funnelArrow: { color: colors.textMuted, fontSize: 10 },
  funnelCount: { color: colors.text, fontSize: fontSizes.base, fontWeight: '700' },
  funnelItem: { alignItems: 'center', gap: 1 },
  funnelLabel: { color: colors.textSecondary, fontSize: 9 },
  funnelStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSizes.base,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  pill: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillText: { fontSize: fontSizes.xs, fontWeight: '600' },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  rowContent: { flex: 1 },

  rowMeta: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  rowName: { color: colors.text, flex: 1, fontSize: fontSizes.base, fontWeight: '600' },
  rowTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  title: { ...textStyles.pageTitle },
});
