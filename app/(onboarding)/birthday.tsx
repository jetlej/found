import { useBasicsStep } from "@/hooks/useBasicsStep";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BirthdayScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: "birthday",
  });
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [birthdate, setBirthdate] = useState<Date>(new Date(2000, 0, 1));
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentUser && !hasLoaded) {
      if (currentUser.birthdate) setBirthdate(new Date(currentUser.birthdate));
      setHasLoaded(true);
    }
  }, [currentUser, hasLoaded]);

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

  const handleContinue = () => {
    if (!canProceed) {
      setError("You must be 18 or older to use Found");
      return;
    }
    setError("");
    save({ birthdate: birthdate.toISOString() });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        {isEditing && (
          <View style={styles.closeHeader}>
            <Pressable style={styles.closeButton} onPress={close}>
              <IconChevronLeft size={28} color={colors.text} />
            </Pressable>
          </View>
        )}
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
              {loading ? "Saving..." : isEditing ? "Save" : "Next"}
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
  closeHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  closeButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
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
