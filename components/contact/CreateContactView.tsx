import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  HelperText,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { SearchableDropdownField } from '@/components/ui/SearchableDropdownField';
import { useAuth } from '@/contexts/auth-context';
import { useOptionalSearch } from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  createCustomer,
  fetchContactTags,
  fetchTownships,
  searchContactsByPhone,
} from '@/services/customers';
import { ContactSearchResult, ContactTag, Customer, Township } from '@/types/customer';
import { validateMyanmarPhone } from '@/utils/myanmar-phone';

type CreateContactForm = {
  name: string;
  email: string;
  phone: string;
  street: string;
  street2: string;
  township: string;
  townshipId: string;
  tagIds: string[];
};

const EMPTY_FORM: CreateContactForm = {
  name: '',
  email: '',
  phone: '',
  street: '',
  street2: '',
  township: '',
  townshipId: '',
  tagIds: [],
};

function cleanLabel(value: string): string {
  return String(value || '')
    .replace('*', '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findMatchingTownship(
  inputText: string,
  townships: Township[],
): Township | null {
  const value = cleanLabel(inputText);
  if (!value) {
    return null;
  }

  let exact: Township | null = null;
  let contains: Township | null = null;

  for (const township of townships) {
    const cleanTownshipName = cleanLabel(township.name);
    if (cleanTownshipName === value) {
      exact = township;
      break;
    }
    if (!contains && cleanTownshipName.includes(value)) {
      contains = township;
    }
  }

  return exact || contains;
}

function toggleTag(currentTagIds: string[], tagId: string): string[] {
  return currentTagIds.includes(tagId)
    ? currentTagIds.filter(id => id !== tagId)
    : [...currentTagIds, tagId];
}

type CreateContactViewProps = {
  initialPhone?: string;
  embedded?: boolean;
  onCreated?: (customer: Customer) => void;
  onCancel?: () => void;
};

export function CreateContactView({
  initialPhone = '',
  embedded = false,
  onCreated,
  onCancel,
}: CreateContactViewProps = {}) {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { isMobile } = useResponsive();
  const search = useOptionalSearch();
  const setDetailHeader = search?.setDetailHeader;

  const [form, setForm] = useState<CreateContactForm>({
    ...EMPTY_FORM,
    phone: initialPhone,
  });
  const [townshipOptions, setTownshipOptions] = useState<Township[]>([]);
  const [tagOptions, setTagOptions] = useState<ContactTag[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [matches, setMatches] = useState<ContactSearchResult[]>([]);
  const [checkingPhoneOnBlur, setCheckingPhoneOnBlur] = useState(false);

  const phoneDuplicate = matches.length > 0;

  const townshipNames = useMemo(
    () => townshipOptions.map(township => township.name).sort((a, b) => a.localeCompare(b)),
    [townshipOptions],
  );

  const goBack = useCallback(() => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.back();
  }, [onCancel, router]);

  useEffect(() => {
    if (embedded || !setDetailHeader) {
      return;
    }

    setDetailHeader({
      title: 'New Contact',
      breadcrumbParent: 'Contacts',
      onBack: goBack,
    });

    return () => setDetailHeader(null);
  }, [embedded, goBack, setDetailHeader]);

  useEffect(() => {
    if (!initialPhone) {
      return;
    }
    setForm(current =>
      current.phone === initialPhone ? current : { ...current, phone: initialPhone },
    );
  }, [initialPhone]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    setLoadingMeta(true);
    Promise.all([
      fetchTownships(session.token),
      fetchContactTags(session.token),
    ])
      .then(([townships, tags]) => {
        setTownshipOptions(townships);
        setTagOptions(tags);
      })
      .catch(() => {
        setSnackbar('Could not load townships or tags.');
      })
      .finally(() => setLoadingMeta(false));
  }, [session?.token]);

  const handleTownshipChange = (townshipName: string) => {
    const match = townshipOptions.find(township => township.name === townshipName);
    setForm(prev => ({
      ...prev,
      township: townshipName,
      townshipId: match?.id ?? '',
    }));
  };

  const lookupDuplicates = useCallback(
    async (normalizedPhone: string) => {
      if (!session?.token) {
        return [];
      }

      const results = await searchContactsByPhone(session.token, normalizedPhone);
      setMatches(results);
      return results;
    },
    [session?.token],
  );

  const handlePhoneChange = (value: string) => {
    setForm(prev => ({ ...prev, phone: value }));
    setMatches([]);
    setFormError('');
  };

  const handlePhoneBlur = async () => {
    if (!form.phone.trim()) {
      setPhoneError('');
      setMatches([]);
      return;
    }

    let normalized = '';

    try {
      normalized = validateMyanmarPhone(form.phone, 'ဖုန်းနံပါတ်');
      setForm(prev => ({ ...prev, phone: normalized }));
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      setMatches([]);
      return;
    }

    if (!session?.token) {
      return;
    }

    setCheckingPhoneOnBlur(true);

    try {
      await lookupDuplicates(normalized);
    } catch {
      // Keep manual check available if auto lookup fails.
    } finally {
      setCheckingPhoneOnBlur(false);
    }
  };

  const handleCheckPhone = async () => {
    if (!session?.token) {
      return;
    }

    setFormError('');
    setMatches([]);

    let normalized = '';

    try {
      normalized = validateMyanmarPhone(form.phone, 'ဖုန်းနံပါတ်');
      setForm(prev => ({ ...prev, phone: normalized }));
      setPhoneError('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid phone number.';
      setPhoneError(message);
      return;
    }

    setCheckingPhone(true);

    try {
      const results = await lookupDuplicates(normalized);

      if (results.length === 0) {
        setSnackbar('No existing contact found for this phone number.');
      } else {
        setFormError(
          'This phone number already belongs to an existing contact. You cannot create a duplicate.',
        );
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Failed to search contacts.',
      );
    } finally {
      setCheckingPhone(false);
    }
  };

  const openExistingContact = (contactId: string) => {
    router.replace({
      pathname: '/customers',
      params: { detailId: contactId },
    });
  };

  const handleSave = async () => {
    if (!session?.token) {
      return;
    }

    setFormError('');
    setPhoneError('');

    const name = form.name.trim();
    if (!name) {
      setFormError('Customer / shop name is required.');
      return;
    }

    let phone = '';

    try {
      phone = validateMyanmarPhone(form.phone, 'ဖုန်းနံပါတ်');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      return;
    }

    const matchedTownship =
      (form.townshipId
        ? townshipOptions.find(township => township.id === form.townshipId)
        : null) || findMatchingTownship(form.township, townshipOptions);

    if (!matchedTownship) {
      setFormError('Township not found. Please choose a township from the list.');
      return;
    }

    if (phoneDuplicate) {
      setFormError(
        'This phone number already belongs to an existing contact. Open the existing contact instead of creating a new one.',
      );
      return;
    }

    setSaving(true);

    try {
      const existing = await lookupDuplicates(phone);
      if (existing.length > 0) {
        setFormError(
          'This phone number already belongs to an existing contact. Open the existing contact instead of creating a new one.',
        );
        setSaving(false);
        return;
      }

      const created = await createCustomer(session.token, {
        name,
        email: form.email.trim() || undefined,
        phone,
        street: form.street.trim() || undefined,
        street2: form.street2.trim() || undefined,
        townshipId: matchedTownship.id,
        tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
      });

      if (onCreated) {
        onCreated(created);
        return;
      }

      router.replace({
        pathname: '/customers',
        params: { detailId: created.id, created: '1' },
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Failed to create contact in Odoo.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading form...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isMobile ? styles.contentMobile : styles.contentDesktop,
        ]}
        keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.title}>
          Create New Contact
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Fill in customer details. Phone, name, and township are required.
        </Text>

        <TextInput
          mode="outlined"
          label="Phone Number *"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          error={!!phoneError || phoneDuplicate}
        />
        {phoneError ? <HelperText type="error">{phoneError}</HelperText> : null}
        {phoneDuplicate ? (
          <HelperText type="error">
            This phone number already exists. Open the contact below or use a different
            number. New customers cannot be created with a duplicate phone.
          </HelperText>
        ) : null}
        {checkingPhoneOnBlur ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Checking phone number...
          </Text>
        ) : null}

        <Button
          mode="contained-tonal"
          icon="account-search-outline"
          loading={checkingPhone}
          disabled={checkingPhone || !form.phone.trim()}
          onPress={handleCheckPhone}
          style={styles.checkButton}>
          Check Existing Contact
        </Button>

        {matches.length > 0 ? (
          <View style={styles.matchesSection}>
            <Text variant="titleSmall" style={[styles.matchesTitle, { color: theme.colors.error }]}>
              Existing contact found — creation blocked
            </Text>
            {matches.map(match => (
              <Card key={match.id} style={styles.matchCard}>
                <Card.Content>
                  <Text variant="titleMedium">{match.name}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Phone: {match.phone || '—'}
                  </Text>
                  {match.street ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      Address 1: {match.street}
                    </Text>
                  ) : null}
                  {match.street2 ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      Address 2: {match.street2}
                    </Text>
                  ) : null}
                  {match.township || match.city ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {[match.township, match.city].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                  <Button
                    mode="outlined"
                    style={styles.useContactButton}
                    onPress={() => openExistingContact(match.id)}>
                    Open This Contact
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label="Customer / Shop Name *"
          value={form.name}
          onChangeText={value => setForm(prev => ({ ...prev, name: value }))}
        />

        <TextInput
          mode="outlined"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={value => setForm(prev => ({ ...prev, email: value }))}
        />

        <TextInput
          mode="outlined"
          label="Address 1"
          placeholder="Building / shop address..."
          value={form.street}
          onChangeText={value => setForm(prev => ({ ...prev, street: value }))}
        />

        <TextInput
          mode="outlined"
          label="Address 2"
          placeholder="Additional address / landmark..."
          value={form.street2}
          onChangeText={value => setForm(prev => ({ ...prev, street2: value }))}
        />

        <SearchableDropdownField
          label="Township *"
          value={form.township}
          options={townshipNames}
          onChange={handleTownshipChange}
          placeholder="Search township"
        />

        <View style={styles.tagSuggestions}>
          <Text variant="labelLarge" style={styles.tagSuggestionsLabel}>
            Contact Tags
          </Text>
          {tagOptions.length > 0 ? (
            <View style={styles.tagChips}>
              {tagOptions.map(tag => {
                const selected = form.tagIds.includes(tag.id);
                return (
                  <Chip
                    key={tag.id}
                    compact
                    selected={selected}
                    onPress={() =>
                      setForm(prev => ({
                        ...prev,
                        tagIds: toggleTag(prev.tagIds, tag.id),
                      }))
                    }
                    style={styles.tagChip}>
                    {tag.name}
                  </Chip>
                );
              })}
            </View>
          ) : (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No tags found in Odoo. Add contact tags in Odoo first.
            </Text>
          )}
        </View>

        {formError ? <HelperText type="error">{formError}</HelperText> : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <Button mode="outlined" disabled={saving} onPress={goBack}>
          Cancel
        </Button>
        <Button
          mode="contained"
          loading={saving}
          disabled={saving || phoneDuplicate || !!phoneError}
          onPress={handleSave}>
          Create Contact
        </Button>
      </View>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 8,
  },
  checkButton: {
    alignSelf: 'flex-start',
  },
  matchesSection: {
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  matchesTitle: {
    fontWeight: '600',
  },
  matchCard: {
    borderRadius: 10,
  },
  useContactButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  tagSuggestions: {
    gap: 8,
  },
  tagSuggestionsLabel: {
    fontWeight: '600',
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default CreateContactView;
