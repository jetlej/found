import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";

interface ProgressBarProps {
  current: number;
  total: number;
  category?: string;
  categoryProgress?: number; // 0-1 progress within category
}

export function ProgressBar({
  current,
  total,
  category,
  categoryProgress,
}: ProgressBarProps) {
  // If category progress is provided, use it; otherwise fall back to overall progress
  const progress = categoryProgress ?? Math.min(current / total, 1);

  return (
    <View style={styles.container}>
      {category && <Text style={styles.category}>{category}</Text>}
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.label}>
        {current} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  category: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  barContainer: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
