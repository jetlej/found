import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

// Try to use MMKV, fall back to in-memory storage for Expo Go
let mmkvStorage: StateStorage;

try {
  const { MMKV } = require("react-native-mmkv");
  const storage = new MMKV({ id: "app-offline" });

  mmkvStorage = {
    getItem: (name: string) => {
      const value = storage.getString(name);
      return value ?? null;
    },
    setItem: (name: string, value: string) => {
      storage.set(name, value);
    },
    removeItem: (name: string) => {
      storage.delete(name);
    },
  };
  console.log("[Storage] Using MMKV");
} catch {
  // Fallback for Expo Go - in-memory storage (no persistence)
  const memoryStorage: Record<string, string> = {};
  mmkvStorage = {
    getItem: (name: string) => memoryStorage[name] ?? null,
    setItem: (name: string, value: string) => {
      memoryStorage[name] = value;
    },
    removeItem: (name: string) => {
      delete memoryStorage[name];
    },
  };
  console.warn(
    "[Storage] MMKV not available, using in-memory storage (no persistence)"
  );
}

export type CachedUser = {
  _id: string;
  clerkId: string;
  name?: string;
  avatarUrl?: string;
};

type OfflineState = {
  // Connection state
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // Cached user
  cachedUser: CachedUser | null;
  setCachedUser: (user: CachedUser | null) => void;

  // Dev mode user impersonation (only used in __DEV__)
  devClerkId: string | null;
  setDevClerkId: (id: string | null) => void;

  // Clear all cached data (for logout)
  clearAllCache: () => void;
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      // Connection state
      isOnline: true,
      setOnline: (online) => set({ isOnline: online }),

      // Cached user
      cachedUser: null,
      setCachedUser: (user) => set({ cachedUser: user }),

      // Dev mode user impersonation
      devClerkId: null,
      setDevClerkId: (id) => set({ devClerkId: id }),

      // Clear all cache
      clearAllCache: () =>
        set({
          cachedUser: null,
          devClerkId: null,
        }),
    }),
    {
      name: "app-offline",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
