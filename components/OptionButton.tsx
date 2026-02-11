import { colors, fontSizes, shadows, spacing } from "@/lib/theme";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

type Variant = "default" | "compact" | "pill" | "chip" | "row";

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: Variant;
}

export function OptionButton({
  label,
  selected,
  onPress,
  variant = "default",
}: OptionButtonProps) {
  return (
    <Pressable
      style={[
        styles.base,
        variantStyles[variant],
        selected && styles.selected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          (variant === "compact" || variant === "chip") && styles.textCompact,
          selected && styles.textSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  textCompact: {
    fontSize: fontSizes.base,
  },
  textSelected: {
    color: colors.primaryText,
    fontWeight: "600",
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  default: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  compact: {
    width: "48%" as unknown as number,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  pill: {
    borderRadius: 24,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    borderRadius: 24,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
};
