import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";

interface ImportanceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ImportanceSlider({ value, onChange }: ImportanceSliderProps) {
  return (
    <View>
      <Text style={styles.label}>
        How important is it that your partner aligns with you here?
      </Text>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <View style={styles.labels}>
          <Text style={styles.endLabel}>Not important</Text>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.endLabel}>Very important</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginTop: spacing["3xl"],
    marginBottom: spacing.xs,
  },
  sliderContainer: {
    marginTop: 0,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  endLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  valueText: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.text,
  },
});
