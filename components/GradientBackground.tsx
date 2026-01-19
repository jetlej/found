import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, ViewStyle } from "react-native";

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

// Soft sage gradient - lighter top to darker bottom
const GRADIENT_COLORS = ["#EDF0EE", "#EDF0EE"] as const;

export function GradientBackground({ children, style }: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
