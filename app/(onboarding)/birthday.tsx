import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { goToNextStep } from "@/lib/onboarding-flow";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BirthdayScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [birthdate, setBirthdate] = useState<Date>(new Date(2000, 0, 1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Reset loading state when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
    }, [])
  );

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.birthdate) setBirthdate(new Date(currentUser.birthdate));
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const canProceed = calculateAge(birthdate) >= 18;

  const handleContinue = async () => {
    if (!userId) return;

    if (!canProceed) {
      setError("You must be 18 or older to use Found");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await updateBasics({ clerkId: userId, birthdate: birthdate.toISOString() });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "age-range" });
      goToNextStep(router, "birthday", isEditing);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <Text style={styles.question}>What's your birthday?</Text>
          <Text style={styles.questionSubtext}>
            You must be 18 or older to use Found
          </Text>

          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={birthdate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(event, date) => {
                if (date) {
                  setBirthdate(date);
                  setError("");
                }
              }}
              style={styles.datePicker}
              textColor={colors.text}
            />
          </View>

          <View style={styles.ageDisplay}>
            <Text style={styles.ageText}>
              {calculateAge(birthdate)} years old
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
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
  content: {
    flex: 1,
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
  datePickerContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  datePicker: {
    height: 200,
    width: "100%",
  },
  ageDisplay: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  ageText: {
    fontSize: fontSizes.xl,
    fontWeight: "600",
    color: colors.text,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.md,
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
