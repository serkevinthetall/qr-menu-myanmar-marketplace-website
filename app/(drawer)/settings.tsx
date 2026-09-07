import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
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
  fetchLoginDevices,
  LoginDevice,
  revokeLoginDevice,
} from '@/services/auth';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';
import {
  readOnlineOrderAlertsEnabled,
  writeOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';
import {
  playOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';

const screen = NAV_ITEMS.find(item => item.name === 'settings')!;

function deviceIcon(platform: string): string {
  const p = platform.toLowerCase();
  if (p === 'ios' || p === 'android') return 'cellphone';
  if (p === 'macos' || p === 'windows' || p === 'linux') return 'laptop';
  return 'monitor';
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { mode, setMode } = useAppTheme();
  const { user, session, logout } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState('');
  const [devices, setDevices] = useState<LoginDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAlertsEnabled(readOnlineOrderAlertsEnabled());
    }
  }, []);

  const loadDevices = useCallback(async () => {
    if (!session?.token) return;
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const rows = await fetchLoginDevices(session.token);
      setDevices(rows);
    } catch (err) {
      setDevices([]);
      setDevicesError(
        err instanceof Error ? err.message : 'Failed to load devices.',
      );
    } finally {
      setDevicesLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

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

  const onRevokeDevice = useCallback(
    async (device: LoginDevice) => {
      if (!session?.token) return;
      setRevokingId(device.id);
      try {
        const result = await revokeLoginDevice(session.token, device.id);
        if (result.revokedCurrent) {
          setSnack('This device was signed out.');
          await logout();
          return;
        }
        setSnack(`Signed out ${device.label}.`);
        await loadDevices();
      } catch (err) {
        setSnack(
          err instanceof Error ? err.message : 'Failed to sign out device.',
        );
      } finally {
        setRevokingId(null);
      }
    },
    [session?.token, loadDevices, logout],
  );

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
          <List.Subheader>Devices logged in</List.Subheader>
          <Text style={[styles.devicesHint, { color: theme.colors.onSurfaceVariant }]}>
            Browsers and handheld app sessions signed in with your account. Signing
            out a device ends that session immediately.
          </Text>
          {devicesLoading ? (
            <View style={styles.devicesLoading}>
              <ActivityIndicator />
            </View>
          ) : devicesError ? (
            <View style={styles.devicesActions}>
              <Text style={{ color: theme.colors.error, marginBottom: 8 }}>
                {devicesError}
              </Text>
              <Button mode="outlined" onPress={() => void loadDevices()}>
                Retry
              </Button>
            </View>
          ) : devices.length === 0 ? (
            <List.Item
              title="No device sessions yet"
              description="Log out and log in again to start tracking devices."
              left={props => <List.Icon {...props} icon="devices" />}
            />
          ) : (
            devices.map(device => (
              <List.Item
                key={device.id}
                title={device.label}
                description={[
                  device.ip ? `IP ${device.ip}` : null,
                  `Last active ${formatMyanmarDateTime(device.lastSeenAt)}`,
                  `Signed in ${formatMyanmarDateTime(device.createdAt)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                left={props => (
                  <List.Icon {...props} icon={deviceIcon(device.platform)} />
                )}
                right={() => (
                  <View style={styles.deviceRight}>
                    {device.current ? (
                      <Chip compact style={styles.currentChip}>
                        This device
                      </Chip>
                    ) : (
                      <Button
                        compact
                        mode="text"
                        textColor={theme.colors.error}
                        loading={revokingId === device.id}
                        disabled={Boolean(revokingId)}
                        onPress={() => {
                          void onRevokeDevice(device);
                        }}>
                        Sign out
                      </Button>
                    )}
                  </View>
                )}
              />
            ))
          )}
          <View style={styles.devicesActions}>
            <Button
              mode="outlined"
              icon="refresh"
              disabled={devicesLoading}
              onPress={() => {
                void loadDevices();
              }}>
              Refresh devices
            </Button>
          </View>
        </List.Section>

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
  devicesHint: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
  },
  devicesLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  devicesActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  deviceRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 110,
  },
  currentChip: {
    alignSelf: 'center',
  },
  segmented: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
