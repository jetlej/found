import { InterestPicker } from "@/components/InterestPicker";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import Slider from "@react-native-community/slider";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

export interface Question {
  _id: string;
  order: number;
  questionKey: string;
  text: string;
  type: "multiple_choice" | "text" | "essay" | "scale" | "range" | "checklist" | "interest_picker";
  options?: string[];
  category?: string;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  linkedQuestionKey?: string;
  hasDealbreaker?: boolean;
}

interface QuestionCardProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  isDealbreaker?: boolean;
  onDealbreakerChange?: (isDealbreaker: boolean) => void;
}

export function QuestionCard({
  question,
  value,
  onChange,
  isDealbreaker,
  onDealbreakerChange,
}: QuestionCardProps) {
  // Local state for slider to show value while dragging
  const [sliderValue, setSliderValue] = useState<number | null>(null);
  const isSliding = useRef(false);
  
  // Local state for range slider (min/max)
  const [rangeMinValue, setRangeMinValue] = useState<number | null>(null);
  const [rangeMaxValue, setRangeMaxValue] = useState<number | null>(null);

  // Reset local slider values when question changes
  useEffect(() => {
    setSliderValue(null);
    setRangeMinValue(null);
    setRangeMaxValue(null);
    isSliding.current = false;
  }, [question._id]);

  // Parse checklist value from JSON
  const getChecklistValue = (): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case "multiple_choice":
        return (
          <View style={styles.optionsContainer}>
            {question.options?.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.option,
                  value === option && styles.optionSelected,
                ]}
                onPress={() => onChange(option)}
              >
                <View style={[styles.radio, value === option && styles.radioSelected]}>
                  {value === option && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    value === option && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
            {/* Dealbreaker toggle for multiple choice with hasDealbreaker */}
            {question.hasDealbreaker && value && onDealbreakerChange && (
              <View style={styles.dealbreakerContainer}>
                <Text style={styles.dealbreakerLabel}>This is a dealbreaker</Text>
                <Switch
                  value={isDealbreaker ?? false}
                  onValueChange={onDealbreakerChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            )}
          </View>
        );

      case "checklist":
        const selectedOptions = getChecklistValue();
        const options = question.options || [];
        const hasOpenToAny = options.includes("Open to any");
        const nonOpenOptions = options.filter((o) => o !== "Open to any");
        const isOpenToAny = selectedOptions.includes("Open to any");
        
        // Show dealbreaker toggle if specific options selected (not just "Open to any")
        const showDealbreaker = 
          selectedOptions.length > 0 && 
          !isOpenToAny && 
          onDealbreakerChange;

        const handleChecklistToggle = (option: string) => {
          let newSelected: string[];

          if (option === "Open to any") {
            if (isOpenToAny) {
              // Uncheck "Open to any" and all options
              newSelected = [];
            } else {
              // Check "Open to any" and all other options
              newSelected = [...options];
            }
          } else {
            if (selectedOptions.includes(option)) {
              // Uncheck this option
              newSelected = selectedOptions.filter((o) => o !== option);
              // Also uncheck "Open to any" if it was checked
              newSelected = newSelected.filter((o) => o !== "Open to any");
            } else {
              // Check this option
              newSelected = [...selectedOptions, option];
              // If all non-open options are now selected, also check "Open to any"
              const allNonOpenSelected = nonOpenOptions.every((o) =>
                newSelected.includes(o)
              );
              if (allNonOpenSelected && hasOpenToAny) {
                newSelected = [...options];
              }
            }
          }

          onChange(JSON.stringify(newSelected));
          
          // Reset dealbreaker if switching to "Open to any"
          if (newSelected.includes("Open to any") && onDealbreakerChange) {
            onDealbreakerChange(false);
          }
        };

        return (
          <View style={styles.optionsContainer}>
            {options.map((option) => {
              const isChecked = selectedOptions.includes(option);
              const isOpenOption = option === "Open to any";

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.option,
                    isChecked && styles.optionSelected,
                    isOpenOption && styles.openToAnyOption,
                  ]}
                  onPress={() => handleChecklistToggle(option)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isChecked && styles.checkboxSelected,
                    ]}
                  >
                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      isChecked && styles.optionTextSelected,
                      isOpenOption && styles.openToAnyText,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
            {/* Dealbreaker toggle - shown when specific options are selected */}
            {showDealbreaker && (
              <View style={styles.dealbreakerContainer}>
                <Text style={styles.dealbreakerLabel}>This is a dealbreaker</Text>
                <Switch
                  value={isDealbreaker ?? false}
                  onValueChange={onDealbreakerChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            )}
          </View>
        );

      case "interest_picker":
        // Parse selected interest IDs from JSON
        const selectedInterestIds = (() => {
          if (!value) return [];
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();

        return (
          <View style={styles.interestPickerContainer}>
            <InterestPicker
              selectedIds={selectedInterestIds}
              onChange={(ids) => onChange(JSON.stringify(ids))}
            />
          </View>
        );

      case "text":
        return (
          <TextInput
            style={styles.textInput}
            placeholder="Type your answer..."
            placeholderTextColor={colors.textPlaceholder}
            value={value}
            onChangeText={onChange}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        );

      case "essay":
        return (
          <TextInput
            style={[styles.textInput, styles.essayInput]}
            placeholder="Share your thoughts..."
            placeholderTextColor={colors.textPlaceholder}
            value={value}
            onChangeText={onChange}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        );

      case "scale":
        const min = question.scaleMin ?? 1;
        const max = question.scaleMax ?? 10;
        const savedValue = value ? parseInt(value, 10) : null;
        const displayValue = sliderValue ?? savedValue ?? Math.floor((min + max) / 2);

        // Check if this is a height scale (labels contain feet/inches pattern)
        const isHeightScale = 
          question.scaleMinLabel?.includes("'") && 
          question.scaleMaxLabel?.includes("'");

        // Format height in feet/inches
        const formatHeight = (inches: number) => {
          const feet = Math.floor(inches / 12);
          const remainingInches = inches % 12;
          return `${feet}'${remainingInches}"`;
        };

        // Show the label text if at min/max and labels exist, or format height
        const displayText =
          displayValue === max && question.scaleMaxLabel
            ? question.scaleMaxLabel
            : displayValue === min && question.scaleMinLabel
              ? question.scaleMinLabel
              : isHeightScale
                ? formatHeight(displayValue)
                : String(displayValue);

        return (
          <View style={styles.scaleContainer}>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>
                {question.scaleMinLabel || min}
              </Text>
              <Text style={styles.scaleValue}>{displayText}</Text>
              <Text style={styles.scaleLabel}>
                {question.scaleMaxLabel || max}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={min}
              maximumValue={max}
              step={1}
              value={displayValue}
              onSlidingStart={() => {
                isSliding.current = true;
              }}
              onValueChange={(v) => {
                if (isSliding.current) {
                  setSliderValue(Math.round(v));
                }
              }}
              onSlidingComplete={(v) => {
                const rounded = Math.round(v);
                isSliding.current = false;
                // Keep the local value set to prevent jump-back glitch
                setSliderValue(rounded);
                onChange(String(rounded));
              }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            {/* Dealbreaker toggle for scale with hasDealbreaker */}
            {question.hasDealbreaker && value && onDealbreakerChange && (
              <View style={styles.dealbreakerContainer}>
                <Text style={styles.dealbreakerLabel}>This is a dealbreaker</Text>
                <Switch
                  value={isDealbreaker ?? false}
                  onValueChange={onDealbreakerChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            )}
          </View>
        );

      case "range":
        const rangeMin = question.scaleMin ?? 1;
        const rangeMax = question.scaleMax ?? 10;
        
        // Parse saved value as JSON {min, max}
        const savedRange = value ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })() : null;
        
        const currentMin = rangeMinValue ?? savedRange?.min ?? rangeMin;
        const currentMax = rangeMaxValue ?? savedRange?.max ?? rangeMax;

        // Check if this is a height range (labels contain feet/inches pattern)
        const isHeightRange = 
          question.scaleMinLabel?.includes("'") && 
          question.scaleMaxLabel?.includes("'");

        // Format height in feet/inches
        const formatHeightRange = (inches: number) => {
          const feet = Math.floor(inches / 12);
          const remainingInches = inches % 12;
          return `${feet}'${remainingInches}"`;
        };

        const formatRangeValue = (val: number) => {
          if (isHeightRange) return formatHeightRange(val);
          return String(val);
        };

        return (
          <View style={styles.rangeContainer}>
            {/* Display current range */}
            <View style={styles.rangeDisplay}>
              <Text style={styles.rangeValue}>
                {formatRangeValue(currentMin)} – {formatRangeValue(currentMax)}
              </Text>
            </View>

            {/* Labels */}
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeEndLabel}>{question.scaleMinLabel || rangeMin}</Text>
              <Text style={styles.rangeEndLabel}>{question.scaleMaxLabel || rangeMax}</Text>
            </View>

            {/* Dual-thumb slider */}
            <MultiSlider
              values={[currentMin, currentMax]}
              min={rangeMin}
              max={rangeMax}
              step={1}
              sliderLength={280}
              onValuesChange={(values) => {
                setRangeMinValue(values[0]);
                setRangeMaxValue(values[1]);
              }}
              onValuesChangeFinish={(values) => {
                setRangeMinValue(values[0]);
                setRangeMaxValue(values[1]);
                onChange(JSON.stringify({ min: values[0], max: values[1] }));
              }}
              selectedStyle={{ backgroundColor: colors.primary }}
              unselectedStyle={{ backgroundColor: colors.border }}
              markerStyle={{
                backgroundColor: colors.primary,
                height: 24,
                width: 24,
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 3,
              }}
              pressedMarkerStyle={{
                backgroundColor: colors.primary,
                height: 28,
                width: 28,
                borderRadius: 14,
              }}
              containerStyle={{ alignSelf: "center" }}
              trackStyle={{ height: 6, borderRadius: 3 }}
            />

            {/* Dealbreaker toggle */}
            {question.hasDealbreaker && value && onDealbreakerChange && (
              <View style={styles.dealbreakerContainer}>
                <Text style={styles.dealbreakerLabel}>This is a dealbreaker</Text>
                <Switch
                  value={isDealbreaker ?? false}
                  onValueChange={onDealbreakerChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderInput()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  questionText: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["2xl"],
    color: colors.text,
    lineHeight: 32,
    marginBottom: spacing["2xl"],
  },
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSecondary,
  },
  openToAnyOption: {
    marginBottom: spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  optionText: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: "600",
  },
  openToAnyText: {
    fontStyle: "italic",
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    fontSize: fontSizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  essayInput: {
    minHeight: 150,
    maxHeight: 300,
  },
  scaleContainer: {
    gap: spacing.lg,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scaleLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    maxWidth: 100,
  },
  scaleValue: {
    fontSize: fontSizes["3xl"],
    fontWeight: "700",
    color: colors.text,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  rangeContainer: {
    gap: spacing.lg,
  },
  rangeDisplay: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  rangeValue: {
    fontSize: fontSizes["2xl"],
    fontWeight: "700",
    color: colors.text,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  rangeEndLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  dealbreakerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  dealbreakerLabel: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: "500",
  },
  interestPickerContainer: {
    flex: 1,
    minHeight: 400,
  },
});
