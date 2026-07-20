import { Stack } from 'expo-router';
import { Appbar, useTheme } from 'react-native-paper';

import { AppMenuButton } from '@/components/app/AppMenuButton';

function QuotesHeader({ title }: { title: string }) {
  const theme = useTheme();

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
      <AppMenuButton />
      <Appbar.Content
        title={title}
        color={theme.colors.onPrimary}
        titleStyle={{ color: theme.colors.onPrimary, fontWeight: '700' }}
      />
    </Appbar.Header>
  );
}

export default function AppQuotationsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: '700', color: theme.colors.onPrimary },
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Quotes',
          header: () => <QuotesHeader title="Quotes" />,
        }}
      />
      <Stack.Screen name="new" options={{ title: 'New quote' }} />
      <Stack.Screen name="[id]" options={{ title: 'Quote' }} />
    </Stack>
  );
}
