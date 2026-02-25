import { useBasicsStep } from '@/hooks/useBasicsStep';
import { useScreenReady } from '@/hooks/useScreenReady';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BirthdayScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: 'birthday',
  });
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [birthdate, setBirthdate] = useState<Date>(new Date(2000, 0, 1));
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && !hasLoaded) {
      if (currentUser.birthdate) setBirthdate(new Date(currentUser.birthdate));
      setHasLoaded(true);
    }
  }, [currentUser, hasLoaded]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const canProceed = calculateAge(birthdate) >= 18;

  const handleContinue = () => {
    if (!canProceed) {
      setError('You must be 18 or older to use Found');
      return;
    }
    setError('');
    save({ birthdate: birthdate.toISOString() });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        {isEditing && (
          <View style={styles.closeHeader}>
            <Pressable style={styles.closeButton} onPress={close}>
              <IconChevronLeft size={28} color={colors.text} />
            </Pressable>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.question}>What's your birthday?</Text>
          <Text style={styles.questionSubtext}>You must be 18 or older to use Found</Text>

          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={birthdate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(event, date) => {
                if (date) {
                  setBirthdate(date);
                  setError('');
                }
              }}
              style={styles.datePicker}
              textColor={colors.text}
            />
          </View>

          <View style={styles.ageDisplay}>
            <Text style={styles.ageText}>{calculateAge(birthdate)} years old</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (!canProceed || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canProceed || loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : isEditing ? 'Save' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ageDisplay: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  ageText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '600',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  closeHeader: {
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  datePicker: {
    height: 200,
    width: '100%',
  },
  datePickerContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  question: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: fontSizes['3xl'],
    marginBottom: spacing.sm,
  },
  questionSubtext: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    marginBottom: spacing.xl,
  },
});
