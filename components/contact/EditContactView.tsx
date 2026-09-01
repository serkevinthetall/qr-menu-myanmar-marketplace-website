import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  Chip,
  HelperText,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import {
  ContactForm,
  EMPTY_CONTACT_FORM,
  findMatchingTownship,
  toggleTag,
} from '@/components/contact/contact-form-shared';
import { SearchableDropdownField } from '@/components/ui/SearchableDropdownField';
import { useAuth } from '@/contexts/auth-context';
import { useOptionalSearch } from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchContactTags,
  fetchCustomerDetail,
  fetchTownships,
  searchContactsByPhone,
  updateCustomer,
} from '@/services/customers';
import { ContactSearchResult, ContactTag, CustomerDetail, Township } from '@/types/customer';
import { validateMyanmarPhone } from '@/utils/myanmar-phone';

type EditContactViewProps = {
  contactId: string;
  onUpdated?: (detail: CustomerDetail) => void;
  onCancel?: () => void;
};

export function EditContactView({
  contactId,
  onUpdated,
  onCancel,
}: EditContactViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { isMobile } = useResponsive();
  const search = useOptionalSearch();
  const setDetailHeader = search?.setDetailHeader;

  const [form, setForm] = useState<ContactForm>(EMPTY_CONTACT_FORM);
  const [townshipOptions, setTownshipOptions] = useState<Township[]>([]);
  const [tagOptions, setTagOptions] = useState<ContactTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [matches, setMatches] = useState<ContactSearchResult[]>([]);

  const phoneDuplicate = matches.some(match => match.id !== contactId);

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
    if (!setDetailHeader) {
      return;
    }

    setDetailHeader({
      title: 'Edit Contact',
      breadcrumbParent: 'Contacts',
      onBack: goBack,
    });

    return () => setDetailHeader(null);
  }, [goBack, setDetailHeader]);

  useEffect(() => {
    if (!session?.token || !contactId) {
      return;
    }

    setLoading(true);
    Promise.all([
      fetchCustomerDetail(session.token, contactId),
      fetchTownships(session.token),
      fetchContactTags(session.token),
    ])
      .then(([detail, townships, tags]) => {
        setTownshipOptions(townships);
        setTagOptions(tags);
        setForm({
          name: detail.name ?? '',
          email: detail.email ?? '',
          phone: detail.phone ?? '',
          street: detail.street ?? '',
          street2: detail.street2 ?? '',
          township: detail.township ?? '',
          townshipId: detail.townshipId ?? '',
          tagIds: detail.tagIds ?? [],
        });
      })
      .catch(() => {
        setFormError('Could not load contact details.');
      })
      .finally(() => setLoading(false));
  }, [session?.token, contactId]);

  const handleTownshipChange = (townshipName: string) => {
    const match = townshipOptions.find(township => township.name === townshipName);
    setForm(prev => ({
      ...prev,
      township: townshipName,
      townshipId: match?.id ?? '',
    }));
  };

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

    try {
      const results = await searchContactsByPhone(session.token, normalized);
      setMatches(results.filter(match => match.id !== contactId));
    } catch {
      setMatches([]);
    }
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
        'This phone number already belongs to another contact. Use a different number.',
      );
      return;
    }

    setSaving(true);

    try {
      const existing = await searchContactsByPhone(session.token, phone);
      const duplicate = existing.some(match => match.id !== contactId);
      if (duplicate) {
        setFormError(
          'This phone number already belongs to another contact. Use a different number.',
        );
        setSaving(false);
        return;
      }

      const updated = await updateCustomer(session.token, contactId, {
        name,
        email: form.email.trim() || undefined,
        phone,
        street: form.street.trim() || undefined,
        street2: form.street2.trim() || undefined,
        townshipId: matchedTownship.id,
        tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
      });

      if (onUpdated) {
        onUpdated(updated);
        return;
      }

      router.replace({
        pathname: '/customers',
        params: { detailId: contactId, updated: '1' },
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Failed to update contact in Odoo.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading contact...</Text>
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
          Edit Contact
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Update customer details. Phone, name, and township are required.
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
            This phone number already belongs to another contact.
          </HelperText>
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
          Save Changes
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
