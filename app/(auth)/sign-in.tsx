import { colors, fonts, fontSizes, spacing } from '@/lib/theme';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignIn() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
    setError('');
  };

  const getE164Phone = () => {
    const digits = phone.replace(/\D/g, '');
    return `+1${digits}`;
  };

  const handleContinue = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    const phoneE164 = getE164Phone();

    try {
      const signInAttempt = await signIn?.create({
        identifier: phoneE164,
      });

      await signIn?.prepareFirstFactor({
        strategy: 'phone_code',
        phoneNumberId: signInAttempt?.supportedFirstFactors?.find(
          (f) => f.strategy === 'phone_code'
        )?.phoneNumberId,
      });

      router.push({
        pathname: '/(auth)/verify',
        params: { phone: phoneE164, isSignUp: 'false' },
      });
    } catch (signInError: any) {
      if (signInError?.errors?.[0]?.code === 'form_identifier_not_found') {
        try {
          await signUp?.create({
            phoneNumber: phoneE164,
          });

          await signUp?.preparePhoneNumberVerification();

          router.push({
            pathname: '/(auth)/verify',
            params: { phone: phoneE164, isSignUp: 'true' },
          });
        } catch (signUpError: any) {
          setError(signUpError?.errors?.[0]?.message ?? 'Something went wrong');
        }
      } else {
        setError(signInError?.errors?.[0]?.message ?? 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Found.</Text>
          <Text style={styles.subtitle}>Enter your phone number to continue</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            testID="phone-input"
            style={styles.input}
            placeholder="(555) 555-5555"
            placeholderTextColor={colors.textPlaceholder}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={14}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending code...' : 'Continue'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    left: spacing.xl,
    position: 'absolute',
    top: spacing.lg,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  error: {
    color: colors.error,
    fontSize: fontSizes.sm,
  },
  form: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.lg,
    padding: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  logo: {
    color: colors.text,
    fontFamily: fonts.logo,
    fontSize: fontSizes['4xl'],
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
  },
});
