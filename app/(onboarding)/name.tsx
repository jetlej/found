import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { goToNextStep } from "@/lib/onboarding-flow";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NameScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Reset loading state when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
    }, [])
  );

  // Load saved data from database
  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.name) setFirstName(currentUser.name);
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  // Delay focus until after page transition completes to avoid jank
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Listen for keyboard events to get actual keyboard height
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // Subtract bottom safe area since parent SafeAreaView already accounts for it
      setKeyboardHeight(e.endCoordinates.height - insets.bottom);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const canProceed = firstName.trim().length > 0;

  const handleContinue = async () => {
    if (!userId || !canProceed) return;

    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, name: firstName.trim() });
      await setOnboardingStep({ clerkId: userId, step: "gender" });
      goToNextStep(router, "name");
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.question}>What's your first name?</Text>
          <Text style={styles.questionSubtext}>
            This is how you'll appear to matches
          </Text>
          <TextInput
            ref={inputRef}
            style={styles.nameInput}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: spacing.lg + keyboardHeight }]}>
          <TouchableOpacity
            style={[styles.button, (!canProceed || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canProceed || loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["2xl"],
  },
  question: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.sm,
  },
  questionSubtext: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  nameInput: {
    fontSize: fontSizes.xl,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
