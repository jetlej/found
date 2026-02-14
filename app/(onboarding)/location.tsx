import { useBasicsStep } from "@/hooks/useBasicsStep";
import { useScreenReady } from "@/hooks/useScreenReady";
import { colors, fonts, fontSizes, spacing } from "@/lib/theme";
import {
  IconChevronLeft,
  IconMapPin,
  IconMapPinSearch,
} from "@tabler/icons-react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LocationScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: "location",
  });
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentUser?.location && location === null)
      setLocation(currentUser.location);
  }, [currentUser]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  const canProceed = !!location;

  const requestLocation = async () => {
    setLocationLoading(true);
    setError("");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required");
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const locationString = [place.city, place.region]
          .filter(Boolean)
          .join(", ");
        setLocation(locationString || "Unknown location");
      }
    } catch (err) {
      setError("Could not get your location");
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
          <Text style={styles.questionSubtext}>
            We'll use this to find matches near you
          </Text>

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
            style={[
              styles.button,
              (!canProceed || loading) && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!canProceed || loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : isEditing ? "Save" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  closeButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["2xl"],
  },
  question: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    color: colors.text,
    marginBottom: spacing.sm,
  },
  questionSubtext: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },
  locationButtonText: {
    fontSize: fontSizes.lg,
    color: colors.primaryText,
    fontWeight: "600",
  },
  locationResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    marginTop: spacing.lg,
  },
  locationText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: "600",
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: "600",
    color: colors.primaryText,
  },
});
