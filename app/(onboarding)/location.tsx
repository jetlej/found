import { useBasicsStep } from '@/hooks/useBasicsStep';
import { useScreenReady } from '@/hooks/useScreenReady';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { IconChevronLeft, IconMapPin, IconMapPinSearch } from '@tabler/icons-react-native';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LocationScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: 'location',
  });
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser?.location && location === null) setLocation(currentUser.location);
  }, [currentUser]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const canProceed = !!location;

  const requestLocation = async () => {
    setLocationLoading(true);
    setError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required');
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const locationString = [place.city, place.region].filter(Boolean).join(', ');
        setLocation(locationString || 'Unknown location');
      }
    } catch (err) {
      setError('Could not get your location');
    }

    setLocationLoading(false);
  };

  const handleContinue = () => {
    if (!canProceed) return;
    save({ location });
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
          <Text style={styles.question}>Where are you located?</Text>
          <Text style={styles.questionSubtext}>We'll use this to find matches near you</Text>

          {location ? (
            <View style={styles.locationResult}>
              <IconMapPin size={24} color={colors.success} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          ) : (
            <Pressable
              style={styles.locationButton}
              onPress={requestLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <>
                  <IconMapPinSearch size={24} color={colors.primaryText} />
                  <Text style={styles.locationButtonText}>Enable Location</Text>
                </>
              )}
            </Pressable>
          )}

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
  locationButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  locationButtonText: {
    color: colors.primaryText,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  locationResult: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.success,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  locationText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600',
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
