import * as SecureStore from "expo-secure-store";

const AUTH_CACHE_KEY = "offline_auth_cache";
const USER_CACHE_KEY = "offline_user_cache";

interface CachedAuth {
  userId: string;
  isSignedIn: boolean;
  cachedAt: number;
}

interface CachedUser {
  _id: string;
  clerkId: string;
  name?: string;
  avatarUrl?: string;
}

export async function getCachedAuth(): Promise<CachedAuth | null> {
  try {
    const cached = await SecureStore.getItemAsync(AUTH_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (e) {
    console.warn("[OfflineAuth] Failed to get cached auth:", e);
    return null;
  }
}

export async function setCachedAuth(auth: CachedAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_CACHE_KEY, JSON.stringify(auth));
  } catch (e) {
    console.warn("[OfflineAuth] Failed to set cached auth:", e);
  }
}

export async function clearCachedAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_CACHE_KEY);
  } catch (e) {
    console.warn("[OfflineAuth] Failed to clear cached auth:", e);
  }
}

export async function getCachedUser(): Promise<CachedUser | null> {
  try {
    const cached = await SecureStore.getItemAsync(USER_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (e) {
    console.warn("[OfflineAuth] Failed to get cached user:", e);
    return null;
  }
}

export async function setCachedUser(user: CachedUser): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn("[OfflineAuth] Failed to set cached user:", e);
  }
}

export async function clearCachedUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_CACHE_KEY);
  } catch (e) {
    console.warn("[OfflineAuth] Failed to clear cached user:", e);
  }
}




