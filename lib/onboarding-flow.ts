// Onboarding Flow Configuration
// Change the order of steps here to A/B test different flows

export const ONBOARDING_STEPS = ["basics", "photos", "questions"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// Map step names to their routes
export const STEP_ROUTES: Record<OnboardingStep, string> = {
  basics: "/(onboarding)/basics",
  photos: "/(onboarding)/photos",
  questions: "/(onboarding)/questions",
};

// Get the next step after the current one
export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === ONBOARDING_STEPS.length - 1) {
    return null;
  }
  return ONBOARDING_STEPS[currentIndex + 1];
}

// Get the previous step before the current one
export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return ONBOARDING_STEPS[currentIndex - 1];
}

// Get the first step in the flow
export function getFirstStep(): OnboardingStep {
  return ONBOARDING_STEPS[0];
}

// Get the route for a step
export function getStepRoute(step: OnboardingStep): string {
  return STEP_ROUTES[step];
}

// Check if this is the last step
export function isLastStep(step: OnboardingStep): boolean {
  return ONBOARDING_STEPS.indexOf(step) === ONBOARDING_STEPS.length - 1;
}

// Get step progress (1-indexed)
export function getStepProgress(step: OnboardingStep): {
  current: number;
  total: number;
} {
  return {
    current: ONBOARDING_STEPS.indexOf(step) + 1,
    total: ONBOARDING_STEPS.length,
  };
}
