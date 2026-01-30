import { DevTrigger } from "@/components/DevTrigger";
import { api } from "@/convex/_generated/api";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AuthProvider } from "@/lib/clerk";
import { ConvexClientProvider } from "@/lib/convex";
import {
    clearCachedAuth,
    getCachedAuth,
    setCachedAuth,
    setCachedUser,
} from "@/lib/offline-auth";
import { colors } from "@/lib/theme";
import { useOfflineStore } from "@/stores/offline";
import { useAuth } from "@clerk/clerk-expo";
import {
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { useFonts } from "expo-font";
import {
    Stack,
    useRootNavigationState,
    useRouter,
    useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    AppStateStatus,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import "react-native-reanimated";

// Set root background color immediately (light theme)
SystemUI.setBackgroundColorAsync(colors.background);

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

// Helper to determine which onboarding step to resume from
function getOnboardingRoute(user: any): string {
  if (!user) {
    return "/(onboarding)/referral";
  }

  // Use saved onboarding step if available
  if (user.onboardingStep) {
    return `/(onboarding)/${user.onboardingStep}`;
  }

  // Fallback: check if basics are complete (name is now required)
  const basicsComplete = user.name && user.gender && user.sexuality && user.location && user.birthdate && user.heightInches;
  if (!basicsComplete) {
    return "/(onboarding)/referral";
  }

  // Default to photos if no step saved but basics done
  return "/(onboarding)/photos";
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { isOnline, devClerkId } = useOfflineStore();

  // Track if we're using cached auth for offline mode
  const [offlineAuthLoaded, setOfflineAuthLoaded] = useState(false);
  const [cachedUserId, setCachedUserId] = useState<string | null>(null);

  // Timeout fallback for debugging (60s to account for slow Clerk production init)
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.log(
          "[Auth] Clerk timed out - isLoaded:",
          isLoaded,
          "isOnline:",
          isOnline
        );
        setTimedOut(true);
      }
    }, 60000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Load cached auth on mount for offline support
  useEffect(() => {
    async function loadCachedAuth() {
      const cached = await getCachedAuth();
      if (cached?.isSignedIn && cached.userId) {
        setCachedUserId(cached.userId);
      }
      setOfflineAuthLoaded(true);
    }
    loadCachedAuth();
  }, []);

  // Cache auth state when online and signed in
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      setCachedAuth({
        userId,
        isSignedIn: true,
        cachedAt: Date.now(),
      });
    } else if (isLoaded && !isSignedIn) {
      clearCachedAuth();
    }
  }, [isLoaded, isSignedIn, userId]);

  // Determine effective auth state (use cached when offline, or dev override)
  const isDevImpersonating = __DEV__ && !!devClerkId;
  const effectiveIsSignedIn = isDevImpersonating
    ? true
    : isOnline
      ? isSignedIn
      : isSignedIn || !!cachedUserId;
  const effectiveUserId = isDevImpersonating
    ? devClerkId
    : isOnline
      ? userId
      : userId || cachedUserId;

  // Query current user from Convex (skip if offline and no network)
  const currentUser = useQuery(
    api.users.current,
    effectiveUserId ? { clerkId: effectiveUserId } : "skip"
  );

  // Get cached user from offline store
  const { cachedUser, setCachedUser: setOfflineUser } = useOfflineStore();

  // Cache user data when we get it from Convex
  useEffect(() => {
    if (currentUser && currentUser._id) {
      const userToCache = {
        _id: currentUser._id,
        clerkId: currentUser.clerkId,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
        onboardingComplete: currentUser.onboardingComplete,
      };
      setCachedUser(userToCache);
      setOfflineUser(userToCache);
    }
  }, [currentUser?._id, currentUser?.name, currentUser?.avatarUrl, currentUser?.onboardingComplete]);

  // Initialize offline sync and push notifications
  useOfflineSync();
  usePushNotifications();

  // Track if we've completed initial routing
  const [hasRouted, setHasRouted] = useState(false);

  useEffect(() => {
    // Wait for auth and navigation to be ready
    // When offline or dev impersonating, we can proceed with cached/dev auth
    const authReady = isDevImpersonating
      ? true
      : isOnline
        ? isLoaded
        : isLoaded || offlineAuthLoaded;
    if (!authReady || !navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";
    const onLandingPage = segments[0] === undefined || segments.length === 0;

    if (!effectiveIsSignedIn) {
      // Not signed in - allow landing page and auth screens
      if (!inAuthGroup && !onLandingPage) {
        router.replace("/");
      }
      setHasRouted(true);
    } else {
      // Signed in - check if user needs onboarding
      if (inAuthGroup || onLandingPage) {
        // Just finished auth or on landing, check if user exists and has completed onboarding
        // When offline, use cached user data
        const userData = currentUser ?? cachedUser;

        if (!isOnline && cachedUser) {
          // Offline with cached user - proceed to main app or onboarding
          if (cachedUser.onboardingComplete) {
            router.replace("/(tabs)");
          } else {
            router.replace("/(onboarding)/referral");
          }
          setHasRouted(true);
        } else if (currentUser === undefined && isOnline) {
          // Still loading user data - don't mark as routed yet
          return;
        } else if (!userData?.onboardingComplete) {
          // Determine which onboarding step to resume from
          const onboardingRoute = getOnboardingRoute(currentUser);
          router.replace(onboardingRoute);
          setHasRouted(true);
        } else {
          router.replace("/(tabs)");
          setHasRouted(true);
        }
      } else {
        // Already on a valid screen
        if (
          !inOnboarding &&
          isOnline &&
          currentUser !== undefined &&
          !currentUser?.onboardingComplete
        ) {
          // Signed in but onboarding not complete - redirect to appropriate step
          const onboardingRoute = getOnboardingRoute(currentUser);
          router.replace(onboardingRoute);
        }
        setHasRouted(true);
      }
    }
  }, [
    isLoaded,
    effectiveIsSignedIn,
    segments,
    navigationState?.key,
    currentUser,
    isOnline,
    offlineAuthLoaded,
    cachedUser,
    isDevImpersonating,
  ]);

  // Note: We don't hide splash screen here anymore.
  // Individual screens use useScreenReady() hook to hide splash when their data is ready.

  // Show nothing (keep splash screen visible) until routing is complete
  // This prevents any flash of wrong screens
  if (!hasRouted) {
    if (timedOut) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Auth Loading Failed</Text>
          <Text style={styles.errorText}>
            Clerk didn't initialize. Check your production instance
            configuration.
          </Text>
        </View>
      );
    }
    // Return null to keep native splash screen visible
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 10,
  },
  errorText: {
    color: colors.textMuted,
    textAlign: "center",
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Figtree-Regular": Figtree_400Regular,
    "Figtree-Medium": Figtree_500Medium,
    "Figtree-SemiBold": Figtree_600SemiBold,
    "Figtree-Bold": Figtree_700Bold,
    "Avigea": require("../assets/fonts/Avigea.ttf"),
    "Avigea-Italic": require("../assets/fonts/Avigea-Italic.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Note: We don't hide splash screen here anymore.
  // AuthGate will hide it once routing is determined.

  // Show custom splash while fonts load
  if (!loaded) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ConvexClientProvider>
        <RootLayoutNav />
      </ConvexClientProvider>
    </AuthProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});

// Custom light theme with our colors
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function useUpdateChecker() {
  const [updateReady, setUpdateReady] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkForUpdate = async () => {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setUpdateReady(true);
      }
    } catch (e) {
      // Silently fail
    }
  };

  useEffect(() => {
    // Check on mount
    checkForUpdate();

    // Check when app comes to foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          checkForUpdate();
        }
        appState.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, []);

  const applyUpdate = async () => {
    await Updates.reloadAsync();
  };

  return { updateReady, applyUpdate };
}

function UpdateBanner({
  visible,
  onUpdate,
}: {
  visible: boolean;
  onUpdate: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={updateStyles.banner}>
      <Text style={updateStyles.bannerText}>App update available</Text>
      <Pressable onPress={onUpdate} style={updateStyles.bannerButton}>
        <Text style={updateStyles.bannerButtonText}>Restart</Text>
      </Pressable>
    </View>
  );
}

const updateStyles = StyleSheet.create({
  banner: {
    backgroundColor: "#22c55e",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    marginBottom: -42,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  bannerButton: {
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
});

function RootLayoutNav() {
  const { updateReady, applyUpdate } = useUpdateChecker();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={CustomLightTheme}>
        <StatusBar style={updateReady ? "light" : "dark"} />
        <UpdateBanner visible={updateReady} onUpdate={applyUpdate} />
        <AuthGate>
          <DevTrigger>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(onboarding)"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="profile"
                options={{
                  headerShown: false,
                  presentation: "modal",
                  animation: "slide_from_bottom",
                  gestureEnabled: true,
                }}
              />
            </Stack>
          </DevTrigger>
        </AuthGate>
      </ThemeProvider>
    </View>
  );
}
