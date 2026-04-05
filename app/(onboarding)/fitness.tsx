import { OnboardingScreen } from '@/components/OnboardingScreen';
import { OptionButton } from '@/components/OptionButton';
import { useBasicsStep, useSavedValue } from '@/hooks/useBasicsStep';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { StyleSheet, Text, View } from 'react-native';

const OPTIONS = ['Not at all', 'Somewhat', 'Very', 'Extremely'];

export default function FitnessScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: 'fitness',
  });

  const [fitness, setFitness] = useSavedValue<string | null>(currentUser, 'fitness', null);
  const [partnerFitness, setPartnerFitness] = useSavedValue<string | null>(
    currentUser,
    'partnerFitness',
    null
  );

  const handleContinue = () => {
    if (!fitness || !partnerFitness) return;
    save({ fitness, partnerFitness });
  };

  return (
    <OnboardingScreen
      question="Let's talk about fitness."
      canProceed={!!fitness && !!partnerFitness}
      loading={loading}
      onNext={handleContinue}
      submitLabel={isEditing ? 'Save' : undefined}
      onClose={isEditing ? close : undefined}
    >
      <Text style={styles.subtitle}>Be honest, otherwise, you'll end up running a marathon.</Text>

      <Text style={styles.sectionLabel}>How active are you?</Text>
      <View style={styles.chipRow}>
        {OPTIONS.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={fitness === opt}
            onPress={() => setFitness(opt)}
            variant="chip"
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>How active do you want your partner to be?</Text>
      <View style={styles.chipRow}>
        {OPTIONS.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={partnerFitness === opt}
            onPress={() => setPartnerFitness(opt)}
            variant="chip"
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    marginTop: spacing['2xl'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.serifItalic,
    fontSize: fontSizes.base,
    marginTop: -spacing.md,
  },
});
