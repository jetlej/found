import { api } from "@/convex/_generated/api";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useScreenReady } from "@/hooks/useScreenReady";
import { goToNextStep } from "@/lib/onboarding-flow";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { Picker } from "@react-native-picker/picker";
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

const FEET = [4, 5, 6, 7];
const INCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function HeightScreen() {
  const userId = useEffectiveUserId();
  const router = useRouter();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === "true";
  const currentUser = useQuery(api.users.current, userId ? { clerkId: userId } : "skip");
  const updateBasics = useMutation(api.users.updateBasics);
  const setOnboardingStep = useMutation(api.users.setOnboardingStep);

  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(8);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useFocusEffect(useCallback(() => { setLoading(false); }, []));

  useEffect(() => {
    if (currentUser && !hasLoadedData) {
      if (currentUser.heightInches) {
        setFeet(Math.floor(currentUser.heightInches / 12));
        setInches(currentUser.heightInches % 12);
      }
      setHasLoadedData(true);
    }
  }, [currentUser, hasLoadedData]);

  useEffect(() => { setScreenReady(true); }, []);

  const totalInches = feet * 12 + inches;

  const handleContinue = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateBasics({ clerkId: userId, heightInches: totalInches });
      if (!isEditing) await setOnboardingStep({ clerkId: userId, step: "photos" });
      goToNextStep(router, "height", isEditing);
    } catch { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <Text style={styles.question}>How tall are you?</Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>ft</Text>
              <Picker
                selectedValue={feet}
                onValueChange={setFeet}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {FEET.map((f) => (
                  <Picker.Item key={f} label={String(f)} value={f} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>in</Text>
              <Picker
                selectedValue={inches}
                onValueChange={setInches}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {INCHES.map((i) => (
                  <Picker.Item key={i} label={String(i)} value={i} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.heightDisplay}>
            <Text style={styles.heightText}>{feet}'{inches}"</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{loading ? "Saving..." : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing["2xl"] },
  question: { fontFamily: fonts.serif, fontSize: fontSizes["3xl"], color: colors.text, marginBottom: spacing.sm },
  pickerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  pickerColumn: { alignItems: "center", flex: 1 },
  pickerLabel: { fontSize: fontSizes.base, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },
  picker: { height: 200, width: "100%" },
  pickerItem: { fontSize: fontSizes["2xl"], color: colors.text },
  heightDisplay: { alignItems: "center", marginTop: spacing.lg, paddingVertical: spacing.md },
  heightText: { fontSize: fontSizes.xl, fontWeight: "600", color: colors.text },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: spacing.lg, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: fontSizes.base, fontWeight: "600", color: colors.primaryText },
});
