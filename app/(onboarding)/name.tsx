import { useBasicsStep } from '@/hooks/useBasicsStep';
import { useScreenReady } from '@/hooks/useScreenReady';
import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NameScreen() {
  const { currentUser, isEditing, loading, save, close } = useBasicsStep({
    stepName: 'name',
  });
  const { setReady: setScreenReady, fadeAnim } = useScreenReady();

  const [firstName, setFirstName] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (currentUser?.name && !firstName) setFirstName(currentUser.name);
  }, [currentUser]);

  useEffect(() => {
    setScreenReady(true);
  }, []);

  // Delay focus until after page transition completes to avoid jank
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Listen for keyboard events to get actual keyboard height
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // Subtract bottom safe area since parent SafeAreaView already accounts for it
      setKeyboardHeight(e.endCoordinates.height - insets.bottom);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const canProceed = firstName.trim().length > 0;

  const handleContinue = () => {
    if (!firstName.trim()) return;
    save({ name: firstName.trim() });
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.question}>What's your first name?</Text>
          <Text style={styles.questionSubtext}>This is how you'll appear to matches</Text>
          <TextInput
            testID="name-input"
            ref={inputRef}
            style={styles.nameInput}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: spacing.lg + keyboardHeight }]}>
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
  nameInput: {
    borderBottomColor: colors.border,
    borderBottomWidth: 2,
    color: colors.text,
    fontSize: fontSizes.xl,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
});
