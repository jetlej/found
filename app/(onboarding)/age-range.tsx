import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useBasicsStep } from '@/hooks/useBasicsStep';
import { colors, fontSizes, spacing } from '@/lib/theme';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Switch, Text, View } from 'react-native';

const SLIDER_LENGTH = Dimensions.get('window').width - spacing.xl * 2;

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AgeRangeScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: 'age-range',
  });

  const [minAge, setMinAge] = useState(23);
  const [maxAge, setMaxAge] = useState(33);
  const [isDealbreaker, setIsDealbreaker] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (currentUser && !hasLoaded) {
      if (currentUser.ageRangeMin != null && currentUser.ageRangeMax != null) {
        setMinAge(currentUser.ageRangeMin);
        setMaxAge(currentUser.ageRangeMax);
        setIsDealbreaker(currentUser.ageRangeDealbreaker ?? false);
      } else if (currentUser.birthdate) {
        const myAge = calculateAge(currentUser.birthdate);
        setMinAge(Math.max(18, myAge - 5));
        setMaxAge(Math.min(99, myAge + 5));
      }
      setHasLoaded(true);
    }
  }, [currentUser, hasLoaded]);

  const handleContinue = () => {
    save({
      ageRangeMin: minAge,
      ageRangeMax: maxAge,
      ageRangeDealbreaker: isDealbreaker,
    });
  };

  return (
    <OnboardingScreen
      question="What age range are you looking for?"
      canProceed={true}
      loading={loading}
      onNext={handleContinue}
      submitLabel={isEditing ? 'Save' : undefined}
      onClose={isEditing ? close : undefined}
    >
      <Text style={styles.rangeDisplay}>
        {minAge} – {maxAge} years old
      </Text>

      <View style={styles.sliderContainer}>
        <MultiSlider
          values={[minAge, maxAge]}
          min={18}
          max={99}
          step={1}
          sliderLength={SLIDER_LENGTH}
          onValuesChange={(values) => {
            setMinAge(values[0]);
            setMaxAge(values[1]);
          }}
          selectedStyle={{ backgroundColor: colors.primary }}
          unselectedStyle={{ backgroundColor: colors.border }}
          markerStyle={styles.marker}
          pressedMarkerStyle={styles.markerPressed}
        />
        <View style={styles.labels}>
          <Text style={styles.endLabel}>18</Text>
          <Text style={styles.endLabel}>99</Text>
        </View>
      </View>

      <View style={styles.dealbreakerContainer}>
        <Text style={styles.dealbreakerLabel}>This is a dealbreaker</Text>
        <Switch
          value={isDealbreaker}
          onValueChange={setIsDealbreaker}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  dealbreakerContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dealbreakerLabel: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '500',
  },
  endLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    width: '100%',
  },
  marker: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    elevation: 3,
    height: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: 24,
  },
  markerPressed: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 28,
    width: 28,
  },
  rangeDisplay: {
    color: colors.text,
    fontSize: fontSizes['2xl'],
    fontWeight: '600',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
  },
});
