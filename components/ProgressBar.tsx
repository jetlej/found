import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";

interface ProgressBarProps {
  current: number; // Current question number (1-100)
  total: number; // Total questions (100)
  category?: string; // Category name
  categoryPosition?: number; // Position within category (1-based)
  categoryTotal?: number; // Total questions in category
}

export function ProgressBar({
  current,
  total,
  category,
  categoryPosition,
  categoryTotal,
}: ProgressBarProps) {
  // Progress bar shows overall progress (X/100)
  const progress = Math.min(current / total, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {category && (
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{category}</Text>
            {categoryPosition && categoryTotal && (
              <Text style={styles.categoryCount}> ({categoryPosition}/{categoryTotal})</Text>
            )}
          </View>
        )}
        <Text style={styles.overallCount}>{current} of {total}</Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  category: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  categoryCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  overallCount: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
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
});
