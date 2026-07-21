import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  FAB,
  Text,
  useTheme,
} from 'react-native-paper';

import { AppNewCustomerForm } from '@/components/app/AppNewCustomerForm';
import {
  AppFloatingSearchHeader,
  AppSearchBar,
  APP_FLOATING_SEARCH_INSET,
} from '@/components/app/AppSearchBar';
import { useAuth } from '@/contexts/auth-context';
import { AppContact, fetchAppContacts } from '@/services/app/contacts';

function openNewQuotation(
  router: ReturnType<typeof useRouter>,
  contact: AppContact,
) {
  router.push({
    pathname: '/(app)/quotations/new',
    params: {
      customerId: contact.id,
      customerName: contact.name,
      customerPhone: contact.phone ?? '',
    },
  });
}

export default function AppContactsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [contacts, setContacts] = useState<AppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    if (!session?.token) return;
    setError('');
    try {
      const data = await fetchAppContacts(session.token, {
        q: debounced || undefined,
        limit: 100,
      });
      setContacts(data);
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, debounced]);

  useEffect(() => {
    if (!hasLoadedOnce) setLoading(true);
    void load();
  }, [load, hasLoadedOnce]);

  const handleCreated = (contact: AppContact) => {
    setCreating(false);
    setContacts(prev => {
      if (prev.some(item => item.id === contact.id)) return prev;
      return [contact, ...prev];
    });

    Alert.alert(
      'Customer created',
      `${contact.name} was saved. Do you want to create a quotation?`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Create quotation',
          onPress: () => openNewQuotation(router, contact),
        },
      ],
    );
  };

  if (creating) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <AppNewCustomerForm
          initialName={/\d/.test(query) ? '' : query}
          initialPhone={/\d/.test(query) ? query : ''}
          onCancel={() => setCreating(false)}
          onCreated={handleCreated}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>No contacts found.</Text>
              <Button mode="contained" onPress={() => setCreating(true)}>
                Create new customer
              </Button>
            </View>
          }
          renderItem={({ item }) => {
            const location = [item.township, item.city]
              .map(part => part?.trim())
              .filter(Boolean)
              .join(', ');

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant ?? theme.colors.outline,
                  },
                ]}>
                <View style={styles.cardBody}>
                  <Text variant="titleMedium" style={styles.name}>
                    {item.name}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}>
                    {item.phone || 'No phone'}
                  </Text>
                  {location ? (
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.locationText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}>
                      {location}
                    </Text>
                  ) : null}
                </View>
                <Button
                  mode="contained"
                  compact
                  icon="file-document-plus-outline"
                  onPress={() => openNewQuotation(router, item)}
                  style={styles.quoteBtn}
                  contentStyle={styles.quoteBtnContent}>
                  Quote
                </Button>
              </View>
            );
          }}
        />
      )}

      <AppFloatingSearchHeader>
        <AppSearchBar
          placeholder="Search name or phone"
          value={query}
          onChangeText={setQuery}
        />
      </AppFloatingSearchHeader>

      <FAB
        icon="account-plus"
        label="New customer"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => setCreating(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: 12,
    paddingTop: APP_FLOATING_SEARCH_INSET,
    paddingBottom: 100,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    overflow: 'visible',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  name: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 24,
  },
  metaText: {
    lineHeight: 22,
  },
  locationText: {
    marginTop: 6,
    lineHeight: 22,
  },
  quoteBtn: {
    alignSelf: 'center',
    marginTop: 2,
  },
  quoteBtnContent: {
    height: 40,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 48,
    gap: 16,
    paddingHorizontal: 24,
  },
  empty: { textAlign: 'center', opacity: 0.6 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
