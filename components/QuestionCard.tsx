import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import Slider from "@react-native-community/slider";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export interface Question {
  _id: string;
  order: number;
  text: string;
  type: "multiple_choice" | "text" | "essay" | "scale";
  options?: string[];
  category?: string;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

interface QuestionCardProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function QuestionCard({ question, value, onChange }: QuestionCardProps) {
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
        const numValue = value ? parseInt(value, 10) : Math.floor((min + max) / 2);

        return (
          <View style={styles.scaleContainer}>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>
                {question.scaleMinLabel || min}
              </Text>
              <Text style={styles.scaleValue}>{numValue}</Text>
              <Text style={styles.scaleLabel}>
                {question.scaleMaxLabel || max}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={min}
              maximumValue={max}
              step={1}
              value={numValue}
              onValueChange={(v) => onChange(String(Math.round(v)))}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      {renderInput()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  optionText: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: "600",
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
});
