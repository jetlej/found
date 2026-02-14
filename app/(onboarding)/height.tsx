import { useBasicsStep } from "@/hooks/useBasicsStep";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { Picker } from "@react-native-picker/picker";
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

const FEET = [4, 5, 6, 7];
const INCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function HeightScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: "height",
  });
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(8);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (currentUser && !hasLoaded) {
      if (currentUser.heightInches) {
        setFeet(Math.floor(currentUser.heightInches / 12));
        setInches(currentUser.heightInches % 12);
      }
      setHasLoaded(true);
    }
  }, [currentUser, hasLoaded]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const handleContinue = () => {
    save({ heightInches: feet * 12 + inches });
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
            <Text style={styles.heightText}>
              {feet}'{inches}"
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
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
  container: { flex: 1, backgroundColor: colors.background },
  closeHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  closeButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
  },
  flex: { flex: 1 },
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
  pickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  pickerColumn: { alignItems: "center", flex: 1 },
  pickerLabel: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  picker: { height: 200, width: "100%" },
  pickerItem: { fontSize: fontSizes["2xl"], color: colors.text },
  heightDisplay: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  heightText: { fontSize: fontSizes.xl, fontWeight: "600", color: colors.text },
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
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
