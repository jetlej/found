import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

interface ImportanceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ImportanceSlider({ value, onChange }: ImportanceSliderProps) {
  return (
    <View>
      <Text style={styles.label}>How important is it that your partner aligns with you here?</Text>
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
  endLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    marginBottom: spacing.xs,
    marginTop: spacing['3xl'],
  },
  labels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slider: {
    height: 40,
    width: '100%',
  },
  sliderContainer: {
    marginTop: 0,
  },
  valueText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
});
