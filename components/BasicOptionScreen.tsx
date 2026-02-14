import { colors, fontSizes, spacing } from "@/lib/theme";
import type { OnboardingStep } from "@/lib/onboarding-flow";
import { useBasicsStep, useSavedValue } from "@/hooks/useBasicsStep";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { OptionButton } from "@/components/OptionButton";
import { ImportanceSlider } from "@/components/ImportanceSlider";
import { IconSquare, IconSquareCheckFilled } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type OptionVariant = "default" | "compact" | "pill" | "chip" | "row";

interface BasicOptionScreenProps {
  stepName: OnboardingStep;
  field: string;
  question: string;
  options: Array<string | { value: string; label: string }>;
  optionVariant?: OptionVariant;
  scrollable?: boolean;
  /** Adds a "Visible on profile" toggle, saving to this field */
  visibilityField?: string;
  /** Adds an ImportanceSlider, saving to this field */
  importanceField?: string;
}

export function BasicOptionScreen({
  stepName,
  field,
  question,
  options,
  optionVariant = "default",
  scrollable,
  visibilityField,
  importanceField,
}: BasicOptionScreenProps) {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({ stepName });

  const [selected, setSelected] = useSavedValue<string | null>(currentUser, field, null);
  const [visible, setVisible] = useSavedValue(currentUser, visibilityField ?? "", true);
  const [importance, setImportance] = useSavedValue(currentUser, importanceField ?? "", 5);

  const canAutoAdvance = !isEditing && !visibilityField && !importanceField && currentUser?.[field] == null;

  const handleSelect = (value: string) => {
    setSelected(value);
    if (canAutoAdvance) {
      save({ [field]: value });
    }
  };

  const handleContinue = () => {
    if (!selected) return;
    const data: Record<string, any> = { [field]: selected };
    if (visibilityField) data[visibilityField] = visible;
    if (importanceField) data[importanceField] = importance;
    save(data);
  };

  const isChipLayout = optionVariant === "chip";
  const isRowLayout = optionVariant === "row";

  return (
    <OnboardingScreen
      question={question}
      canProceed={!!selected}
      loading={loading}
      onNext={handleContinue}
      submitLabel={isEditing ? "Save" : undefined}
      scrollable={scrollable}
      onClose={isEditing ? close : undefined}
    >
      <View style={[
        styles.options,
        isChipLayout && styles.chipLayout,
        isRowLayout && styles.rowLayout,
      ]}>
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label;
          return (
            <OptionButton
              key={value}
              label={label}
              selected={selected === value}
              onPress={() => handleSelect(value)}
              variant={optionVariant}
            />
          );
        })}
      </View>
      {importanceField && (
        <ImportanceSlider value={importance as number} onChange={setImportance as any} />
      )}
      {visibilityField && (
        <Pressable style={styles.visibilityRow} onPress={() => setVisible(!visible)}>
          {visible ? (
            <IconSquareCheckFilled size={24} color={colors.primary} />
          ) : (
            <IconSquare size={24} color={colors.textMuted} />
          )}
          <Text style={styles.visibilityText}>Visible on profile</Text>
        </Pressable>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  chipLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rowLayout: {
    flexDirection: "row",
    gap: spacing.md,
  },
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
  },
  visibilityText: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
});
