import { DevTrigger } from "@/components/DevTrigger";
import { UpdateRequiredScreen } from "@/components/UpdateRequiredScreen";
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
import { useConvexAuth, useQuery } from "convex/react";
import * as Application from "expo-application";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
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

import { isValidStep, ONBOARDING_FLOW } from "@/lib/onboarding-flow";

// Helper to determine which onboarding step to resume from
function getOnboardingRoute(user: any): string {
  if (!user) {
    return "/(onboarding)/referral";
  }

  // Use saved onboarding step if it's valid
  if (user.onboardingStep && isValidStep(user.onboardingStep)) {
    return `/(onboarding)/${user.onboardingStep}`;
  }

  // Default to first step
  return "/(onboarding)/referral";
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
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

  // Query current user from Convex (skip until Convex has validated the JWT)
  const currentUser = useQuery(
    api.users.current,
    effectiveUserId && isConvexAuthenticated ? {} : "skip"
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
        } else if (currentUser === undefined && isOnline && isConvexAuthenticated) {
          // Convex auth is ready but user data still loading - wait
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
    isConvexAuthenticated,
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
  const [otaReady, setOtaReady] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkForUpdate = async () => {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setOtaReady(true);
      }
    } catch (e) {
      console.warn("[OTA] Update check failed:", e);
    }
  };

  useEffect(() => {
    checkForUpdate();
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

  const applyOta = async () => {
    await Updates.reloadAsync();
  };

  // Check TestFlight build number
  const minBuild = useQuery(api.config.getMinBuildNumber);
  const currentBuild = parseInt(Application.nativeBuildVersion ?? "0", 10);
  const needsTestFlight =
    minBuild !== null &&
    minBuild !== undefined &&
    currentBuild < minBuild;

  return { otaReady, applyOta, needsTestFlight };
}

function RootLayoutNav() {
  const { otaReady, applyOta, needsTestFlight } = useUpdateChecker();

  if (otaReady) {
    return <UpdateRequiredScreen type="ota" onInstall={applyOta} />;
  }

  if (needsTestFlight) {
    return (
      <UpdateRequiredScreen
        type="testflight"
        onInstall={() =>
          Linking.openURL("itms-beta://beta.apple.com/sp/betaprogram")
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={CustomLightTheme}>
        <StatusBar style="dark" />
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
