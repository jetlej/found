import { api } from "@/convex/_generated/api";
import { colors, fontSizes, spacing } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface DevAdminPanelProps {
  onClose?: () => void;
}

export function DevAdminPanel({ onClose }: DevAdminPanelProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { devClerkId, setDevClerkId } = useOfflineStore();

  // Search users
  const users = useQuery(
    api.users.searchUsers,
    searchQuery.length > 0 ? { query: searchQuery } : "skip"
  );

  // Get current impersonated user details
  const impersonatedUser = useQuery(
    api.users.current,
    devClerkId ? { clerkId: devClerkId } : "skip"
  );

  const createDevTestUser = useMutation(api.users.createDevTestUser);

  const handleCreateFresh = async () => {
    setIsCreating(true);
    try {
      const clerkId = await createDevTestUser();
      setDevClerkId(clerkId);
      onClose?.();
      // Navigate to start of onboarding
      router.replace("/(onboarding)/referral");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectUser = (clerkId: string) => {
    setDevClerkId(clerkId);
    setSearchQuery("");
    onClose?.();
    // Navigate based on user's onboarding status - the AuthGate will handle routing
    router.replace("/");
  };

  const handleReturnToReal = () => {
    setDevClerkId(null);
    onClose?.();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      {/* Impersonation status */}
      {devClerkId && (
        <View style={styles.impersonatingBanner}>
          <Text style={styles.impersonatingText}>
            Impersonating: {impersonatedUser?.name || "Loading..."}
          </Text>
          <Pressable style={styles.returnButton} onPress={handleReturnToReal}>
            <Text style={styles.returnButtonText}>Return to Real Account</Text>
          </Pressable>
        </View>
      )}

      {/* Create fresh user */}
      <Pressable
        style={styles.createButton}
        onPress={handleCreateFresh}
        disabled={isCreating}
      >
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
                <Text style={styles.userName}>
                  {user.name || "Unnamed User"}
                </Text>
                <Text style={styles.userMeta}>
                  {user.phone} · {user.onboardingComplete ? `Lvl ${user.level ?? 1}` : "Not started"}
                </Text>
              </View>
              {user.clerkId === devClerkId && (
                <Text style={styles.activeIndicator}>Active</Text>
              )}
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
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  impersonatingBanner: {
    backgroundColor: colors.warning + "20",
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  impersonatingText: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  returnButton: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  returnButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: "#000",
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  createButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.base,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  userList: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSizes.base,
    fontWeight: "500",
    color: colors.text,
  },
  userMeta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeIndicator: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.success,
  },
  noResults: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
