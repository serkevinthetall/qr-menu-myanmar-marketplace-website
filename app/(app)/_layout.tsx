import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function SalesRepAppLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="contacts/index"
        options={{
          title: 'Contact',
          tabBarLabel: 'Contact',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="quotations/index"
        options={{
          title: 'Quotation',
          tabBarLabel: 'Quotation',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Product',
          tabBarLabel: 'Product',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="package-variant-closed"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quotations/new"
        options={{
          href: null,
          title: 'New Quotation',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="quotations/[id]"
        options={{
          href: null,
          title: 'Quotation Detail',
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
