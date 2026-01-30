// Onboarding Flow Configuration
// Defines the linear flow and provides navigation helpers that work without history

import { Router } from "expo-router";

// The onboarding screens in order (after auth)
export const ONBOARDING_FLOW = ["referral", "basics", "photos"] as const;
export type OnboardingScreen = (typeof ONBOARDING_FLOW)[number];

// Routes for each screen
const SCREEN_ROUTES: Record<OnboardingScreen, string> = {
  referral: "/(onboarding)/referral",
  basics: "/(onboarding)/basics",
  photos: "/(onboarding)/photos",
};

// Get the next screen in the flow
export function getNextScreen(
  current: OnboardingScreen,
): OnboardingScreen | null {
  const index = ONBOARDING_FLOW.indexOf(current);
  if (index === -1 || index === ONBOARDING_FLOW.length - 1) {
    return null;
  }
  return ONBOARDING_FLOW[index + 1];
}

// Get the previous screen in the flow
export function getPrevScreen(
  current: OnboardingScreen,
): OnboardingScreen | null {
  const index = ONBOARDING_FLOW.indexOf(current);
  if (index <= 0) {
    return null;
  }
  return ONBOARDING_FLOW[index - 1];
}

// Navigate forward in the flow (slide from right animation)
export function navigateForward(
  router: Router,
  current: OnboardingScreen,
): void {
  const next = getNextScreen(current);
  if (next) {
    router.replace({
      pathname: SCREEN_ROUTES[next] as any,
      params: { direction: "forward" },
    });
  }
}

// Navigate backward in the flow (slide from left animation)
export function navigateBack(router: Router, current: OnboardingScreen): void {
  const prev = getPrevScreen(current);
  if (prev) {
    router.replace({
      pathname: SCREEN_ROUTES[prev] as any,
      params: { direction: "back" },
    });
  } else {
    // First screen - go to homepage
    router.replace("/");
  }
}

// Navigate to a specific screen with direction
export function navigateTo(
  router: Router,
  screen: OnboardingScreen,
  direction: "forward" | "back" = "forward",
): void {
  router.replace({
    pathname: SCREEN_ROUTES[screen] as any,
    params: { direction },
  });
}
