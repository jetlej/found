import { useOfflineStore } from "@/stores/offline";
import { useAuth } from "@clerk/clerk-expo";

/**
 * Returns the effective user ID, respecting dev mode impersonation.
 * In dev mode with devClerkId set, returns the impersonated user's clerkId.
 * Otherwise returns the real Clerk userId.
 */
export function useEffectiveUserId(): string | null | undefined {
  const { userId: clerkUserId } = useAuth();
  const { devClerkId } = useOfflineStore();

  if (__DEV__ && devClerkId) {
    return devClerkId;
  }

  return clerkUserId;
}
