import { api } from "@/convex/_generated/api";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GENDERS = ["Woman", "Man", "Non-binary"];
const INTERESTED_IN = ["Men", "Women", "Everyone"];

// Height options in feet/inches format
const generateHeightOptions = () => {
  const options: { label: string; inches: number }[] = [];
  for (let feet = 4; feet <= 7; feet++) {
    for (let inches = 0; inches < 12; inches++) {
      if (feet === 4 && inches < 6) continue;
      if (feet === 7 && inches > 6) break;
      const totalInches = feet * 12 + inches;
      options.push({
        label: `${feet}'${inches}"`,
        inches: totalInches,
      });
    }
  }
  return options;
};

const HEIGHT_OPTIONS = generateHeightOptions();

type Step = "gender" | "interested" | "location" | "birthday" | "height";
const STEPS: Step[] = ["gender", "interested", "location", "birthday", "height"];

export default function BasicsScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  // Screen ready state for smooth fade-in from splash
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  // Mark screen as ready immediately (no async data to load)
  useEffect(() => {
    setScreenReady(true);
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [gender, setGender] = useState<string | null>(null);
  const [interestedIn, setInterestedIn] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [birthdate, setBirthdate] = useState<Date>(new Date(2000, 0, 1));
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const step = STEPS[currentStep];

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const canProceed = () => {
    switch (step) {
      case "gender":
        return !!gender;
      case "interested":
        return !!interestedIn;
      case "location":
        return !!location;
      case "birthday":
        return calculateAge(birthdate) >= 18;
      case "height":
        return !!heightInches;
      default:
        return false;
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleNext = async () => {
    setError("");

    if (step === "birthday" && calculateAge(birthdate) < 18) {
      setError("You must be 18 or older to use Found");
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - save and continue
      if (!userId || !gender || !interestedIn || !location || !heightInches) return;

      setLoading(true);
      try {
        await updateBasics({
          clerkId: userId,
          gender,
          sexuality: interestedIn,
          location,
          birthdate: birthdate.toISOString(),
          heightInches,
        });
        await setOnboardingStep({ clerkId: userId, step: "photos" });
        router.push("/(onboarding)/photos");
      } catch (err: any) {
        setError(err.message || "Something went wrong");
        setLoading(false);
      }
    }
  };

  const requestLocation = async () => {
    setLocationLoading(true);
    setError("");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required");
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const locationString = [place.city, place.region]
          .filter(Boolean)
          .join(", ");
        setLocation(locationString || "Unknown location");
      }
    } catch (err) {
      setError("Could not get your location");
    }

    setLocationLoading(false);
  };

  const formatHeight = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  const renderStepContent = () => {
    switch (step) {
      case "gender":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.question}>I am a...</Text>
            <View style={styles.optionsColumn}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.optionLarge, gender === g && styles.optionLargeSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.optionLargeText, gender === g && styles.optionLargeTextSelected]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "interested":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.question}>I'm interested in...</Text>
            <View style={styles.optionsColumn}>
              {INTERESTED_IN.map((i) => (
                <Pressable
                  key={i}
                  style={[styles.optionLarge, interestedIn === i && styles.optionLargeSelected]}
                  onPress={() => setInterestedIn(i)}
                >
                  <Text style={[styles.optionLargeText, interestedIn === i && styles.optionLargeTextSelected]}>
                    {i}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "location":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.question}>Where are you located?</Text>
            <Text style={styles.questionSubtext}>
              We'll use this to find matches near you
            </Text>

            {location ? (
              <View style={styles.locationResult}>
                <Ionicons name="location" size={24} color={colors.success} />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            ) : (
              <Pressable
                style={styles.locationButton}
                onPress={requestLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <>
                    <Ionicons name="location-outline" size={24} color={colors.primaryText} />
                    <Text style={styles.locationButtonText}>Enable Location</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        );

      case "birthday":
        return (
          <View style={styles.stepContent}>
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
                  if (date) setBirthdate(date);
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
          </View>
        );

      case "height":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.question}>How tall are you?</Text>

            <ScrollView
              style={styles.heightPicker}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.heightPickerContent}
            >
              {HEIGHT_OPTIONS.map((h) => (
                <Pressable
                  key={h.inches}
                  style={[
                    styles.heightOption,
                    heightInches === h.inches && styles.heightOptionSelected,
                  ]}
                  onPress={() => setHeightInches(h.inches)}
                >
                  <Text
                    style={[
                      styles.heightOptionText,
                      heightInches === h.inches && styles.heightOptionTextSelected,
                    ]}
                  >
                    {h.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentStep && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {renderStepContent()}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {currentStep > 0 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.nextButton,
                (!canProceed() || loading) && styles.buttonDisabled,
                currentStep === 0 && styles.nextButtonFull,
              ]}
              onPress={handleNext}
              disabled={!canProceed() || loading}
            >
              <Text style={styles.nextButtonText}>
                {loading
                  ? "Saving..."
                  : currentStep === STEPS.length - 1
                    ? "Continue"
                    : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  stepContent: {
    flex: 1,
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
  optionsColumn: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  optionLarge: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionLargeSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLargeText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  optionLargeTextSelected: {
    color: colors.primaryText,
    fontWeight: "600",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },
  locationButtonText: {
    fontSize: fontSizes.lg,
    color: colors.primaryText,
    fontWeight: "600",
  },
  locationResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    marginTop: spacing.lg,
  },
  locationText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: "600",
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
  heightPicker: {
    flex: 1,
    marginTop: spacing.lg,
  },
  heightPickerContent: {
    paddingBottom: spacing.xl,
  },
  heightOption: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heightOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  heightOptionText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  heightOptionTextSelected: {
    color: colors.primaryText,
    fontWeight: "600",
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
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.text,
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
