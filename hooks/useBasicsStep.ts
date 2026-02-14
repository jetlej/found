import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { getNextStep, goToNextStep, type OnboardingStep } from "@/lib/onboarding-flow";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseBasicsStepOptions {
  stepName: OnboardingStep;
}

export function useBasicsStep({ stepName }: UseBasicsStepOptions) {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";

  const currentUser = useQuery(api.users.current, userId ? {} : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);
  const completeCategory = useMutation(api.users.completeCategory);

  const [loading, setLoading] = useState(false);

  // Reset loading when screen regains focus (e.g. navigating back)
  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  /**
   * Save data and navigate. Pass the fields to save via updateBasics.
   * Handles editing vs onboarding navigation automatically.
   * On the last step, completes "the_basics" category and exits to Questions.
   */
  const save = async (data: Record<string, any>) => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateBasics(data);

      if (isEditing) {
        router.back();
      } else {
        const nextStep = getNextStep(stepName);
        if (nextStep) {
          await setOnboardingStep({ step: nextStep });
          goToNextStep(router, stepName);
        } else {
          // Last step — complete the basics category and exit
          await completeCategory({ categoryId: "the_basics" });
          router.replace("/(tabs)/questions");
        }
      }
    } catch {
      setLoading(false);
    }
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/questions");
  };

  return {
    userId,
    currentUser,
    isEditing,
    loading,
    save,
    close,
  };
}

/**
 * Helper hook for loading a saved value from the user record.
 * Returns [value, setValue, hasLoaded] where value auto-populates from currentUser[field].
 */
export function useSavedValue<T>(
  currentUser: any,
  field: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (currentUser && !hasLoadedRef.current) {
      const saved = currentUser[field];
      if (saved !== undefined && saved !== null) setValue(saved as T);
      hasLoadedRef.current = true;
    }
  }, [currentUser, field]);

  return [value, setValue, hasLoadedRef.current];
}
