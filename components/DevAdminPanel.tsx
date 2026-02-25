import { api } from '@/convex/_generated/api';
import { colors, fontSizes, spacing } from '@/lib/theme';
import { useOfflineStore } from '@/stores/offline';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface DevAdminPanelProps {
  onClose?: () => void;
}

export function DevAdminPanel({ onClose }: DevAdminPanelProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { devClerkId, setDevClerkId } = useOfflineStore();

  // Search users
  const users = useQuery(
    api.users.searchUsers,
    searchQuery.length > 0 ? { query: searchQuery } : 'skip'
  );

  const createDevTestUser = useMutation(api.users.createDevTestUser);

  const handleCreateFresh = async () => {
    setIsCreating(true);
    try {
      const clerkId = await createDevTestUser();
      setDevClerkId(clerkId);
      onClose?.();
      // Navigate to start of onboarding
      router.replace('/(onboarding)/referral');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectUser = (clerkId: string) => {
    setDevClerkId(clerkId);
    setSearchQuery('');
    onClose?.();
    // Navigate based on user's onboarding status - the AuthGate will handle routing
    router.replace('/');
  };

  const handleReturnToReal = () => {
    setDevClerkId(null);
    onClose?.();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Impersonation status */}
      {devClerkId && (
        <View style={styles.impersonatingBanner}>
          <Text style={styles.impersonatingText}>Impersonating: {devClerkId}</Text>
          <Pressable style={styles.returnButton} onPress={handleReturnToReal}>
            <Text style={styles.returnButtonText}>Return to Real Account</Text>
          </Pressable>
        </View>
      )}

      {/* Create fresh user */}
      <Pressable style={styles.createButton} onPress={handleCreateFresh} disabled={isCreating}>
        {isCreating ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <Text style={styles.createButtonText}>+ Create Fresh User</Text>
        )}
      </Pressable>

      {/* Search input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or phone..."
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Search results */}
      {users && users.length > 0 && (
        <View style={styles.userList}>
          {users.map((user) => (
            <Pressable
              key={user._id}
              style={styles.userRow}
              onPress={() => handleSelectUser(user.clerkId)}
            >
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name || 'Unnamed User'}</Text>
                <Text style={styles.userMeta}>
                  {user.phone} ·{' '}
                  {user.onboardingComplete ? `Lvl ${user.level ?? 1}` : 'Not started'}
                </Text>
              </View>
              {user.clerkId === devClerkId && <Text style={styles.activeIndicator}>Active</Text>}
            </Pressable>
          ))}
        </View>
      )}

      {searchQuery.length > 0 && users?.length === 0 && (
        <Text style={styles.noResults}>No users found</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    color: colors.success,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  container: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  createButtonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  impersonatingBanner: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  impersonatingText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  noResults: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  returnButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  returnButtonText: {
    color: '#000',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.base,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  userList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  userMeta: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  userName: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '500',
  },
  userRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
