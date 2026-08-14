import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  List,
  SegmentedButtons,
  Snackbar,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';

import { ThemeMode } from '@/constants/colors';
import { NAV_ITEMS } from '@/constants/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import {
  readOnlineOrderAlertsEnabled,
  writeOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';
import {
  playOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';

const screen = NAV_ITEMS.find(item => item.name === 'settings')!;

export default function SettingsScreen() {
  const theme = useTheme();
  const { mode, setMode } = useAppTheme();
  const { user, logout } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAlertsEnabled(readOnlineOrderAlertsEnabled());
    }
  }, []);

  const onToggleAlerts = useCallback(
    async (next: boolean) => {
      if (Platform.OS !== 'web') {
        return;
      }
      setBusy(true);
      try {
        if (!next) {
          writeOnlineOrderAlertsEnabled(false);
          setAlertsEnabled(false);
          setSnack('Order & member notifications turned off.');
          return;
        }

        const ok = await unlockOnlineOrderAlertSound();
        if (!ok) {
          writeOnlineOrderAlertsEnabled(false);
          setAlertsEnabled(false);
          setSnack(
            'Could not enable sound. Allow sound for this site, then try again.',
          );
          return;
        }

        writeOnlineOrderAlertsEnabled(true);
        setAlertsEnabled(true);
        playOnlineOrderAlertSound();
        setSnack('Notifications on — test sound played.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const onTestSound = useCallback(async () => {
    if (Platform.OS !== 'web') {
      return;
    }
    const ok = await unlockOnlineOrderAlertSound();
    if (!ok) {
      setSnack('Could not play sound. Click again after checking browser sound settings.');
      return;
    }
    playOnlineOrderAlertSound();
    setSnack('Test sound played.');
  }, []);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}>
        <Text variant="headlineSmall" style={styles.title}>
          {screen.title}
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          {screen.description}
        </Text>

        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="Theme"
            description={
              mode === 'dark'
                ? 'Night mode is enabled'
                : 'Light mode is enabled'
            }
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
          />
          <View style={styles.segmented}>
            <SegmentedButtons
              value={mode}
              onValueChange={value => setMode(value as ThemeMode)}
              buttons={[
                {
                  value: 'light',
                  label: 'Light',
                  icon: 'white-balance-sunny',
                },
                {
                  value: 'dark',
                  label: 'Night',
                  icon: 'weather-night',
                },
              ]}
            />
          </View>
        </List.Section>

        {Platform.OS === 'web' ? (
          <List.Section>
            <List.Subheader>Notifications</List.Subheader>
            <List.Item
              title="Order & member notifications"
              description="Play a sound when a new App Order or Member Request arrives."
              left={props => <List.Icon {...props} icon="bell-ring-outline" />}
              right={() => (
                <Switch
                  value={alertsEnabled}
                  disabled={busy}
                  onValueChange={value => {
                    void onToggleAlerts(value);
                  }}
                />
              )}
            />
            <View style={styles.notifyActions}>
              <Button
                mode="outlined"
                icon="volume-high"
                disabled={busy || !alertsEnabled}
                onPress={() => {
                  void onTestSound();
                }}>
                Test sound
              </Button>
            </View>
          </List.Section>
        ) : null}

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title={user?.name || 'Signed in'}
            description={user?.email || 'No account details available'}
            left={props => <List.Icon {...props} icon="account-circle-outline" />}
          />
          <View style={styles.accountActions}>
            <Button
              mode="outlined"
              icon="logout"
              textColor={theme.colors.error}
              style={{ borderColor: theme.colors.error }}
              onPress={() => {
                void logout();
              }}>
              Logout
            </Button>
          </View>
        </List.Section>
      </View>

      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack('')}
        duration={4000}
        action={{
          label: 'OK',
          onPress: () => setSnack(''),
        }}>
        {snack}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    gap: 8,
    borderWidth: 1,
  },
  title: {
    fontWeight: '600',
  },
  description: {
    opacity: 0.75,
    marginBottom: 8,
  },
  accountActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  notifyActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  segmented: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
