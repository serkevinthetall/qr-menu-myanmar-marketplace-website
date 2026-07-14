import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Checkbox, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import {
  clearSavedCredentials,
  loadSavedCredentials,
  saveCredentials,
} from '@/utils/saved-credentials';

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savePassword, setSavePassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSavedCredentials().then(saved => {
      if (!saved) {
        return;
      }
      setEmail(saved.email);
      setPassword(saved.password);
      setSavePassword(true);
    });
  }, []);

  const handleLogin = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password });

      if (savePassword) {
        await saveCredentials({ email, password });
      } else {
        await clearSavedCredentials();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}>
          <Image
            source={require('@/assets/images/qr-shop-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />

          <Text variant="headlineSmall" style={styles.title}>
            Sign in to QR Shop ERP
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            Use your Odoo account credentials to continue.
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            mode="outlined"
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(prev => !prev)}
              />
            }
          />

          <Pressable
            onPress={() => setSavePassword(prev => !prev)}
            style={styles.savePasswordRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: savePassword }}>
            <Checkbox
              status={savePassword ? 'checked' : 'unchecked'}
              onPress={() => setSavePassword(prev => !prev)}
            />
            <Text variant="bodyMedium">Save password</Text>
          </Pressable>

          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            Sign in
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 160,
    height: 100,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  savePasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: -8,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
