import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  List,
  SegmentedButtons,
  Text,
  useTheme,
} from 'react-native-paper';

import { ThemeMode } from '@/constants/colors';
import { NAV_ITEMS } from '@/constants/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';

const screen = NAV_ITEMS.find(item => item.name === 'settings')!;

export default function SettingsScreen() {
  const theme = useTheme();
  const { mode, setMode } = useAppTheme();
  const { user, logout } = useAuth();

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
  segmented: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
