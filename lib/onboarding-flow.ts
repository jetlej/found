// Onboarding Flow Configuration
// Defines the linear flow and provides navigation helpers

import { Router } from "expo-router";

// The onboarding screens in order (after auth)
// To reorder steps, just move items in this array
export const ONBOARDING_FLOW = [
  "referral",
  "name",
  "gender",
  "sexuality",
  "location",
  "birthday",
  "height",
  "photos",
] as const;

export type OnboardingStep = (typeof ONBOARDING_FLOW)[number];

// Get the next step in the flow
export function getNextStep(current: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_FLOW.indexOf(current);
  if (index === -1 || index === ONBOARDING_FLOW.length - 1) {
    return null;
  }
  return ONBOARDING_FLOW[index + 1];
}

// Get the previous step in the flow
export function getPrevStep(current: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_FLOW.indexOf(current);
  if (index <= 0) {
    return null;
  }
  return ONBOARDING_FLOW[index - 1];
}

// Navigate forward in the flow using router.push() for natural history
export function goToNextStep(router: Router, current: OnboardingStep): void {
  const next = getNextStep(current);
  if (next) {
    router.push(`/(onboarding)/${next}`);
  } else {
    // End of onboarding - go to main app
    router.replace("/(tabs)");
  }
}

// Get progress as a fraction (0 to 1)
export function getProgress(current: OnboardingStep): number {
  const index = ONBOARDING_FLOW.indexOf(current);
  if (index === -1) return 0;
  return (index + 1) / ONBOARDING_FLOW.length;
}

// Check if a step is valid
export function isValidStep(step: string): step is OnboardingStep {
  return ONBOARDING_FLOW.includes(step as OnboardingStep);
}
