import { createElement, useCallback, useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
  ALERT_SOUND_OPTIONS,
  AlertSoundId,
  isOnlineOrderAlertSoundUnlocked,
  readAlertSoundId,
  startAlertSoundFromUserGesture,
  unlockOnlineOrderAlertSound,
  writeAlertSoundId,
} from '@/utils/online-order-alert-sound';

const screen = NAV_ITEMS.find(item => item.name === 'settings')!;

/** Hardcoded staff contact list workers can call from Settings. */
const STAFF_CONTACTS: ReadonlyArray<{
  name: string;
  phones: readonly string[];
}> = [
  {
    name: 'Sone Pyaw',
    phones: ['09254048093', '09796868543'],
  },
];

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
  const [alertSoundId, setAlertSoundId] = useState<AlertSoundId>('beep');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState('');
  const [devices, setDevices] = useState<LoginDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAlertsEnabled(readOnlineOrderAlertsEnabled());
      setAlertSoundId(readAlertSoundId());
    }
  }, []);

  const loadDevices = useCallback(async () => {
    if (!session?.user) return;
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
  }, [session?.user, session?.token]);

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

        // Play in the same click turn as the switch (keeps Chrome audio unlock).
        const played = await startAlertSoundFromUserGesture();
        if (!played) {
          await unlockOnlineOrderAlertSound();
        }
        if (!played && !isOnlineOrderAlertSoundUnlocked()) {
          writeOnlineOrderAlertsEnabled(false);
          setAlertsEnabled(false);
          setSnack(
            'Could not enable sound. Right-click the Chrome tab → Unmute site, then try again.',
          );
          return;
        }

        writeOnlineOrderAlertsEnabled(true);
        setAlertsEnabled(true);
        setSnack(
          played
            ? 'Notifications on — test sound played.'
            : 'Notifications on — click Test sound once to confirm audio.',
        );
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const onTestSound = useCallback(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    // Play immediately in the click turn — do not await unlock first.
    void startAlertSoundFromUserGesture().then(played => {
      if (!played) {
        setSnack(
          'Could not play sound. Right-click the Chrome tab → Unmute site, then try again.',
        );
        return;
      }
      setSnack('Test sound played.');
    });
  }, []);

  const onRevokeDevice = useCallback(
    async (device: LoginDevice) => {
      if (!session?.user) return;
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
    [session?.user, session?.token, loadDevices, logout],
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
            <List.Item
              title="Notify sound"
              description={
                ALERT_SOUND_OPTIONS.find(o => o.id === alertSoundId)
                  ?.description || 'Choose the sound for new notifies'
              }
              left={props => <List.Icon {...props} icon="music-note" />}
            />
            <View style={styles.soundList}>
              {ALERT_SOUND_OPTIONS.map(option => {
                const selected = option.id === alertSoundId;
                return createElement(
                  'button',
                  {
                    key: option.id,
                    type: 'button',
                    disabled: busy || !alertsEnabled,
                    onClick: (event: {
                      preventDefault: () => void;
                      stopPropagation: () => void;
                    }) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const changed = option.id !== alertSoundId;
                      writeAlertSoundId(option.id);
                      setAlertSoundId(option.id);
                      // Preview only when picking a different sound — not every tap.
                      if (!changed) {
                        setSnack(`${option.label} already selected.`);
                        return;
                      }
                      void startAlertSoundFromUserGesture().then(played => {
                        setSnack(
                          played
                            ? `${option.label} selected — preview played.`
                            : 'Could not play sound. Right-click the Chrome tab → Unmute site.',
                        );
                      });
                    },
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 2,
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      marginBottom: 8,
                      borderRadius: 8,
                      border: `1px solid ${
                        selected ? theme.colors.primary : theme.colors.outline
                      }`,
                      backgroundColor: selected
                        ? theme.colors.primaryContainer
                        : 'transparent',
                      color: theme.colors.onSurface,
                      cursor:
                        busy || !alertsEnabled ? 'not-allowed' : 'pointer',
                      opacity: busy || !alertsEnabled ? 0.45 : 1,
                    },
                  },
                  createElement(
                    'span',
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: selected
                          ? theme.colors.primary
                          : theme.colors.onSurface,
                      },
                    },
                    selected ? `● ${option.label}` : option.label,
                  ),
                  createElement(
                    'span',
                    {
                      style: {
                        fontSize: 12,
                        opacity: 0.75,
                      },
                    },
                    option.description,
                  ),
                );
              })}
            </View>
            <View style={styles.notifyActions}>
              {Platform.OS === 'web'
                ? // Native <button onClick> — RN Paper onPress is NOT a Chrome
                  // user-gesture, so audio.play() was succeeding silently or blocked.
                  createElement(
                    'button',
                    {
                      type: 'button',
                      disabled: busy || !alertsEnabled,
                      onClick: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void startAlertSoundFromUserGesture().then(played => {
                          setSnack(
                            played
                              ? 'Test sound played.'
                              : 'Could not play sound. Right-click the Chrome tab → Unmute site.',
                          );
                        });
                      },
                      style: {
                        padding: '10px 18px',
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.outline}`,
                        backgroundColor: 'transparent',
                        color: theme.colors.primary,
                        cursor:
                          busy || !alertsEnabled ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: busy || !alertsEnabled ? 0.45 : 1,
                      },
                    },
                    'Test sound',
                  )
                : (
                  <Button
                    mode="outlined"
                    icon="volume-high"
                    disabled={busy || !alertsEnabled}
                    onPress={() => {
                      void onTestSound();
                    }}>
                    Test sound
                  </Button>
                )}
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
          <List.Subheader>Contact list</List.Subheader>
          <Text
            style={[styles.devicesHint, { color: theme.colors.onSurfaceVariant }]}>
            Staff contacts workers can call. Tap Call to connect.
          </Text>
          {STAFF_CONTACTS.map(contact => (
            <View key={contact.name} style={styles.contactBlock}>
              <List.Item
                title={contact.name}
                description={contact.phones.join(' · ')}
                left={props => (
                  <List.Icon {...props} icon="account-outline" />
                )}
              />
              <View style={styles.contactActions}>
                {contact.phones.map(phone => (
                  <Button
                    key={phone}
                    mode="outlined"
                    compact
                    icon="phone"
                    onPress={() => {
                      void Linking.openURL(`tel:${phone}`);
                    }}>
                    {phone}
                  </Button>
                ))}
              </View>
            </View>
          ))}
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
  soundList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
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
  contactBlock: {
    marginBottom: 4,
  },
  contactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
