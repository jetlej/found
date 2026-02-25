import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { StyleSheet, Text, View } from 'react-native';

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
              <Text style={styles.categoryCount}>
                {' '}
                ({categoryPosition}/{categoryTotal})
              </Text>
            )}
          </View>
        )}
        <Text style={styles.overallCount}>
          {current} of {total}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: '100%',
  },
  category: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
  },
  categoryCount: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  categoryRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  container: {
    gap: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallCount: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
});
