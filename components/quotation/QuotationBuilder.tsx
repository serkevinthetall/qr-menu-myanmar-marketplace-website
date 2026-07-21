import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  HelperText,
  Icon,
  IconButton,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { CreateContactView } from '@/components/contact/CreateContactView';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { CalendarField } from '@/components/ui/CalendarField';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { DropdownField } from '@/components/ui/DropdownField';
import { ResizableDivider } from '@/components/ui/ResizableDivider';
import { SearchableDropdownField } from '@/components/ui/SearchableDropdownField';
import { VoiceInputButton } from '@/components/ui/VoiceInputButton';
import { useAuth } from '@/contexts/auth-context';
import { useMyanmarSpeechToText, VOICE_MAX_SECONDS } from '@/hooks/use-myanmar-speech-to-text';
import { usePersistedPanelSplit } from '@/hooks/use-persisted-panel-split';
import { useQuotationDraftPersistence } from '@/hooks/use-quotation-draft-persistence';
import { useResponsive } from '@/hooks/use-responsive';
import {
  createCustomerAddress,
  fetchCustomerAddresses,
  fetchTownships,
  searchContactsByPhone,
} from '@/services/customers';
import { Customer, ContactSearchResult, CustomerAddress, Township } from '@/types/customer';
import { Product } from '@/types/product';
import { PaymentMethod, QuotationReorderSeed } from '@/types/quotation';
import { validateMyanmarPhone } from '@/utils/myanmar-phone';
import { StoredQuotationDraft, clearQuotationDraft } from '@/utils/quotation-draft-storage';

const ADD_NEW_ADDRESS_OPTION = '+ Add new address…';
const SALE_PERSON_OPTIONS = [
  'Me Me',
  'Htet Htet',
  'Thiri',
  'Myo Min Khant',
  'Zay Yar Htet',
  'Zaw Htet Naing',
  'Mya Mya Thin',
] as const;

function customerFromAddressCompany(
  company: CustomerAddress,
  fallback?: Customer | null,
): Customer {
  return {
    id: company.id,
    name: company.name,
    email: fallback?.email ?? '',
    phone: company.phone || fallback?.phone || '',
    city: company.city,
    jobPosition: fallback?.jobPosition ?? '',
    company: fallback?.company ?? '',
    isCompany: Boolean(company.isCompany),
    activity: fallback?.activity ?? '',
    township: company.township,
    status: fallback?.status ?? '',
    lastMonthSales: fallback?.lastMonthSales ?? 0,
    thisMonthSales: fallback?.thisMonthSales ?? 0,
    thisMonthPercent: fallback?.thisMonthPercent ?? 0,
    lastInvoiceDate: fallback?.lastInvoiceDate ?? '',
    expoPushToken: fallback?.expoPushToken ?? '',
    extra: fallback?.extra ?? {},
  };
}

function addressDisplay(address: CustomerAddress | undefined): string {
  if (!address) {
    return 'No address on file';
  }
  return (
    [address.street, address.street2, address.township, address.city]
      .filter(Boolean)
      .join(', ') || address.label
  );
}

export type OrderLine = {
  product: Product;
  qty: number;
  unitPrice: number;
  discountPercent: number;
};

export type QuotationDraft = {
  customer: Customer;
  shippingPartnerId?: string;
  salePersonName?: string;
  phoneNumber: string;
  deliveryNote: string;
  preferredDeliveryDate: string;
  paymentMethodLineId?: string;
  lines: OrderLine[];
  total: number;
};

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function lineAmount(line: OrderLine): number {
  const base = line.qty * line.unitPrice;
  const discount = Math.min(Math.max(line.discountPercent, 0), 100);
  return base * (1 - discount / 100);
}

const TABLE_COL_FULL = {
  qty: 98,
  price: 80,
  disc: 56,
  amount: 96,
  delete: 36,
} as const;

const TABLE_COL_COMPACT = {
  qty: 84,
  price: 64,
  disc: 46,
  amount: 72,
  delete: 30,
} as const;

type TableColWidths = typeof TABLE_COL_FULL;

const ORDER_LINE_CARD_BREAKPOINT = 440;
const ORDER_LINE_COMPACT_BREAKPOINT = 620;
const TABLE_COL_GAP = 6;

function resolveTableColWidths(panelWidth: number): TableColWidths {
  if (panelWidth > 0 && panelWidth < ORDER_LINE_COMPACT_BREAKPOINT) {
    return TABLE_COL_COMPACT;
  }
  return TABLE_COL_FULL;
}

function clampPrimarySize(
  total: number,
  ratio: number,
  minPrimary: number,
  minSecondary: number,
): number {
  if (total <= minPrimary + minSecondary) {
    return minPrimary;
  }

  return Math.round(
    Math.min(Math.max(total * ratio, minPrimary), total - minSecondary),
  );
}

type OrderLineRowProps = {
  line: OrderLine;
  variant: 'table' | 'card';
  colWidths?: TableColWidths;
  onQtyChange: (productId: string, qty: number) => void;
  onUnitPriceChange: (productId: string, unitPrice: number) => void;
  onDiscountChange: (productId: string, discountPercent: number) => void;
  onRemove: (productId: string) => void;
};

function OrderLineRow({
  line,
  variant,
  colWidths = TABLE_COL_FULL,
  onQtyChange,
  onUnitPriceChange,
  onDiscountChange,
  onRemove,
}: OrderLineRowProps) {
  const theme = useTheme();
  const outline = theme.colors.outlineVariant ?? theme.colors.outline;
  const [qtyText, setQtyText] = useState(String(line.qty));
  const [priceText, setPriceText] = useState(String(line.unitPrice));
  const [discText, setDiscText] = useState(String(line.discountPercent));

  useEffect(() => {
    setQtyText(String(line.qty));
  }, [line.qty]);

  useEffect(() => {
    setPriceText(String(line.unitPrice));
  }, [line.unitPrice]);

  useEffect(() => {
    setDiscText(String(line.discountPercent));
  }, [line.discountPercent]);

  const commitQty = () => {
    const parsed = parseFloat(qtyText.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQtyText(String(line.qty));
      return;
    }
    onQtyChange(line.product.id, parsed);
  };

  const commitPrice = () => {
    const parsed = parseFloat(priceText.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setPriceText(String(line.unitPrice));
      return;
    }
    onUnitPriceChange(line.product.id, parsed);
  };

  const commitDisc = () => {
    const parsed = parseFloat(discText.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDiscText(String(line.discountPercent));
      return;
    }
    onDiscountChange(line.product.id, Math.min(parsed, 100));
  };

  const stepQty = (delta: number) => {
    const next = line.qty + delta;
    if (next <= 0) {
      onRemove(line.product.id);
      return;
    }
    onQtyChange(line.product.id, next);
  };

  const productCell = (
    <View style={styles.orderProductCell}>
      <ProductThumb uri={line.product.image} size={variant === 'card' ? 48 : 32} />
      <View style={styles.flex1}>
        <Text numberOfLines={2} style={styles.orderProductName}>
          {line.product.name}
        </Text>
        <Text
          variant="labelSmall"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant }}>
          {line.product.unit || 'Units'}
        </Text>
      </View>
    </View>
  );

  const isCompactTable = variant === 'table' && colWidths === TABLE_COL_COMPACT;

  const qtyControl = (
    <View
      style={[
        variant === 'card' ? styles.orderCardQty : styles.qtyStepper,
        variant === 'table' ? { width: colWidths.qty } : null,
      ]}>
      <Pressable
        style={[styles.compactStepBtn, { borderColor: outline }]}
        onPress={() => stepQty(-1)}
        accessibilityLabel="Decrease quantity">
        <Icon source="minus" size={14} color={theme.colors.onSurface} />
      </Pressable>
      <TextInput
        mode="outlined"
        dense
        value={qtyText}
        onChangeText={setQtyText}
        onBlur={commitQty}
        onSubmitEditing={commitQty}
        keyboardType="decimal-pad"
        style={
          variant === 'card'
            ? styles.orderCardQtyInput
            : [styles.qtyStepperInput, isCompactTable && styles.qtyStepperInputCompact]
        }
        contentStyle={
          variant === 'card' ? styles.orderInputContent : styles.orderInputContentCompact
        }
        outlineStyle={styles.orderInputOutline}
      />
      <Pressable
        style={[styles.compactStepBtn, { borderColor: outline }]}
        onPress={() => stepQty(1)}
        accessibilityLabel="Increase quantity">
        <Icon source="plus" size={14} color={theme.colors.onSurface} />
      </Pressable>
    </View>
  );

  const priceInput = (
    <TextInput
      mode="outlined"
      dense
      label={variant === 'card' ? 'Unit Price' : undefined}
      value={priceText}
      onChangeText={setPriceText}
      onBlur={commitPrice}
      onSubmitEditing={commitPrice}
      keyboardType="decimal-pad"
      style={
        variant === 'card'
          ? styles.orderCardFieldInput
          : [styles.orderPriceInput, { width: colWidths.price }]
      }
      contentStyle={
        variant === 'card' ? styles.orderInputContent : styles.orderInputContentCompactRight
      }
      outlineStyle={styles.orderInputOutline}
    />
  );

  const discInput = (
    <TextInput
      mode="outlined"
      dense
      label={variant === 'card' ? 'Disc. %' : undefined}
      value={discText}
      onChangeText={setDiscText}
      onBlur={commitDisc}
      onSubmitEditing={commitDisc}
      keyboardType="decimal-pad"
      style={
        variant === 'card'
          ? styles.orderCardFieldInput
          : [styles.orderDiscInput, { width: colWidths.disc }]
      }
      contentStyle={
        variant === 'card' ? styles.orderInputContent : styles.orderInputContentCompactRight
      }
      outlineStyle={styles.orderInputOutline}
      right={<TextInput.Affix text="%" />}
    />
  );

  if (variant === 'card') {
    return (
      <View style={[styles.orderLineCard, { borderBottomColor: outline }]}>
        <View style={styles.orderLineCardTop}>
          {productCell}
          <IconButton
            icon="trash-can-outline"
            size={18}
            iconColor={theme.colors.error}
            style={styles.orderDeleteBtn}
            onPress={() => onRemove(line.product.id)}
          />
        </View>
        <View style={styles.orderLineCardGrid}>
          <View style={styles.orderCardField}>
            <Text variant="labelSmall" style={styles.orderCardFieldLabel}>
              Quantity
            </Text>
            {qtyControl}
          </View>
          <View style={styles.orderCardField}>{priceInput}</View>
          <View style={styles.orderCardField}>{discInput}</View>
        </View>
        <View style={styles.orderLineCardFooter}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Amount
          </Text>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            {formatMoney(lineAmount(line))}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.orderLineRow, { borderBottomColor: outline }]}>
      <View style={styles.orderColProduct}>{productCell}</View>
      <View style={[styles.orderColFixed, { width: colWidths.qty }]}>{qtyControl}</View>
      <View style={[styles.orderColFixed, { width: colWidths.price }]}>{priceInput}</View>
      <View style={[styles.orderColFixed, { width: colWidths.disc }]}>{discInput}</View>
      <View style={[styles.orderColFixed, { width: colWidths.amount }]}>
        <Text
          variant="bodySmall"
          style={styles.orderAmountText}
          numberOfLines={1}
          ellipsizeMode="tail">
          {formatMoney(lineAmount(line))}
        </Text>
      </View>
      <View style={[styles.orderColFixed, { width: colWidths.delete }]}>
        <IconButton
          icon="trash-can-outline"
          size={16}
          iconColor={theme.colors.error}
          style={styles.orderDeleteBtn}
          onPress={() => onRemove(line.product.id)}
        />
      </View>
    </View>
  );
}

function customerAddress(customer: Customer): string {
  return [customer.township, customer.city].filter(Boolean).join(', ');
}

type QuotationBuilderProps = {
  customers: Customer[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  loading: boolean;
  /** True while product catalog is still loading (Contact tab stays usable). */
  productsLoading?: boolean;
  error: string;
  onDiscard: () => void;
  onSave: (draft: QuotationDraft) => void;
  saving?: boolean;
  initialCustomerId?: string | null;
  initialReorder?: QuotationReorderSeed | null;
  skipDraftRestore?: boolean;
};

export function QuotationBuilder({
  customers,
  products,
  paymentMethods,
  loading,
  productsLoading = false,
  error,
  onDiscard,
  onSave,
  saving = false,
  initialCustomerId = null,
  initialReorder = null,
  skipDraftRestore = false,
}: QuotationBuilderProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop, width: viewportWidth } = useResponsive();
  const [bodySize, setBodySize] = useState({ width: 0, height: 0 });
  const [orderPanelWidth, setOrderPanelWidth] = useState(0);

  const effectiveOrderPanelWidth = orderPanelWidth || viewportWidth;
  const orderLineVariant =
    effectiveOrderPanelWidth > 0 && effectiveOrderPanelWidth < ORDER_LINE_CARD_BREAKPOINT
      ? 'card'
      : 'table';
  const tableColWidths = useMemo(
    () => resolveTableColWidths(effectiveOrderPanelWidth),
    [effectiveOrderPanelWidth],
  );

  const handleOrderPanelLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = event.nativeEvent.layout;
      setOrderPanelWidth(current => (current === width ? current : width));
    },
    [],
  );

  const bodyWidth = bodySize.width > 0 ? bodySize.width : viewportWidth;
  const bodyHeight = bodySize.height > 0 ? bodySize.height : 640;

  const desktopSplit = usePersistedPanelSplit({
    storageKey: 'quotation_desktop_v2',
    defaultRatio: 0.63,
    minRatio: 0.3,
    maxRatio: 0.74,
    containerSize: bodyWidth,
  });

  const mobileSplit = usePersistedPanelSplit({
    storageKey: 'quotation_mobile',
    defaultRatio: 0.52,
    minRatio: 0.28,
    maxRatio: 0.72,
    containerSize: bodyHeight,
  });

  const leftPanelWidth = clampPrimarySize(bodyWidth, desktopSplit.primaryRatio, 300, 260);
  const topPanelHeight = clampPrimarySize(bodyHeight, mobileSplit.primaryRatio, 200, 240);

  const handleBodyLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setBodySize(current =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    },
    [],
  );

  const [tab, setTab] = useState<'contact' | 'products'>('contact');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneMatches, setPhoneMatches] = useState<ContactSearchResult[]>([]);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [salePersonName, setSalePersonName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState('');
  const [paymentMethodLineId, setPaymentMethodLineId] = useState('');
  const [contactError, setContactError] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [voiceBase, setVoiceBase] = useState('');
  const [voiceFinals, setVoiceFinals] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productView, setProductView] = useState<'list' | 'card'>('list');
  const [category, setCategory] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [shippingPartnerId, setShippingPartnerId] = useState('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [createContactPromptOpen, setCreateContactPromptOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  const [townshipOptions, setTownshipOptions] = useState<Township[]>([]);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddressPhone, setNewAddressPhone] = useState('');
  const [newAddressStreet, setNewAddressStreet] = useState('');
  const [newAddressStreet2, setNewAddressStreet2] = useState('');
  const [newAddressTownship, setNewAddressTownship] = useState('');
  const [newAddressTownshipId, setNewAddressTownshipId] = useState('');
  const [newAddressError, setNewAddressError] = useState('');
  const reorderAppliedRef = useRef<string | null>(null);

  const applyDraftRestore = useCallback((draft: StoredQuotationDraft) => {
    setTab(draft.tab);
    setCustomer(draft.customer);
    setPhone(draft.phone);
    setSalePersonName(
      SALE_PERSON_OPTIONS.includes(
        draft.salePersonName as (typeof SALE_PERSON_OPTIONS)[number],
      )
        ? (draft.salePersonName as string)
        : '',
    );
    setDeliveryNote(draft.deliveryNote);
    setPreferredDeliveryDate(draft.preferredDeliveryDate);
    setPaymentMethodLineId(draft.paymentMethodLineId);
    setLines(draft.lines);
    setProductSearch(draft.productSearch);
    setProductView(draft.productView);
    setCategory(draft.category);
    setPhoneMatches([]);
    setPhoneError('');
    setContactError('');
    setSpeechError('');
    setVoiceBase('');
    setVoiceFinals('');
  }, []);

  const draftForm = useMemo(
    () => ({
      tab,
      customer,
      phone,
      salePersonName,
      deliveryNote,
      preferredDeliveryDate,
      paymentMethodLineId,
      lines,
      productSearch,
      productView,
      category,
    }),
    [
      tab,
      customer,
      phone,
      salePersonName,
      deliveryNote,
      preferredDeliveryDate,
      paymentMethodLineId,
      lines,
      productSearch,
      productView,
      category,
    ],
  );

  const { draftRestored, dismissRestoredNotice } = useQuotationDraftPersistence({
    userId: session?.user?.id,
    skipRestore: skipDraftRestore,
    enabled: Boolean(session?.user?.id) && !saving,
    form: draftForm,
    onRestore: applyDraftRestore,
  });

  const handleVoiceTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setSpeechError('');
    setContactError('');
    setVoiceFinals(previous =>
      previous.trim() ? `${previous.trim()} ${trimmed}` : trimmed,
    );
  }, []);

  const {
    isListening,
    isSupported: isVoiceSupported,
    secondsLeft,
    toggle: toggleVoiceInput,
    stop: stopVoiceInput,
  } = useMyanmarSpeechToText({
    onTranscript: handleVoiceTranscript,
    onError: message => {
      if (message) {
        setSpeechError(message);
      }
    },
  });

  const voiceBaseRef = useRef('');
  const voiceFinalsRef = useRef('');
  const deliveryNoteRef = useRef(deliveryNote);

  voiceBaseRef.current = voiceBase;
  voiceFinalsRef.current = voiceFinals;
  deliveryNoteRef.current = deliveryNote;

  const liveDeliveryNote = [voiceBase, voiceFinals]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    return () => {
      stopVoiceInput();
    };
  }, [stopVoiceInput]);

  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (!wasListeningRef.current && isListening) {
      const base = deliveryNoteRef.current.trim();
      voiceBaseRef.current = base;
      voiceFinalsRef.current = '';
      setVoiceBase(base);
      setVoiceFinals('');
    }

    if (wasListeningRef.current && !isListening) {
      const committed = [
        voiceBaseRef.current.trim(),
        voiceFinalsRef.current.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      if (committed) {
        setDeliveryNote(committed);
      }
      setVoiceBase('');
      setVoiceFinals('');
    }

    wasListeningRef.current = isListening;
  }, [isListening]);

  const selectCustomer = (next: Customer | null) => {
    setCustomer(next);
    if (next?.phone) {
      setPhone(next.phone);
    }
    setPhoneMatches([]);
    setPhoneError('');
    if (!next) {
      setAddresses([]);
      setShippingPartnerId('');
      setAddressError('');
    }
  };

  const applyAddressResult = useCallback(
    (
      result: Awaited<ReturnType<typeof fetchCustomerAddresses>>,
      fallbackCustomer?: Customer | null,
    ) => {
      const companyCustomer =
        customers.find(item => item.id === result.companyId) ??
        customerFromAddressCompany(result.company, fallbackCustomer);

      setCustomer(companyCustomer);
      if (companyCustomer.phone) {
        setPhone(companyCustomer.phone);
      }
      setAddresses(result.addresses);
      setShippingPartnerId(result.defaultAddressId);
      setAddressError('');
      setPhoneMatches([]);
      setPhoneError('');
    },
    [customers],
  );

  const loadAddressesForPartner = useCallback(
    async (partnerId: string, fallbackCustomer?: Customer | null) => {
      if (!session?.token || !partnerId) {
        return;
      }

      setLoadingAddresses(true);
      setAddressError('');
      try {
        const result = await fetchCustomerAddresses(session.token, partnerId);
        applyAddressResult(result, fallbackCustomer);
      } catch (error) {
        setAddressError(
          error instanceof Error ? error.message : 'Failed to load delivery addresses.',
        );
        setAddresses([]);
        setShippingPartnerId(partnerId);
      } finally {
        setLoadingAddresses(false);
      }
    },
    [applyAddressResult, session?.token],
  );

  const lookupPhoneMatches = async (normalizedPhone: string) => {
    if (!session?.token) {
      return [];
    }
    const results = await searchContactsByPhone(session.token, normalizedPhone);
    setPhoneMatches(results);
    return results;
  };

  const applyPhoneMatch = (match: ContactSearchResult) => {
    const existing = customers.find(item => item.id === match.id);
    const fallback =
      existing ??
      ({
        id: match.id,
        name: match.name,
        email: '',
        phone: match.phone,
        city: match.city,
        jobPosition: '',
        company: '',
        isCompany: Boolean(match.isCompany),
        activity: '',
        township: match.township,
        status: '',
        lastMonthSales: 0,
        thisMonthSales: 0,
        thisMonthPercent: 0,
        lastInvoiceDate: '',
        expoPushToken: '',
        extra: {},
      } satisfies Customer);

    void loadAddressesForPartner(match.parentId || match.id, fallback);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneMatches([]);
    setPhoneError('');
    setCreateContactPromptOpen(false);
  };

  const handlePhoneBlur = async () => {
    if (!phone.trim()) {
      setPhoneError('');
      setPhoneMatches([]);
      return;
    }

    let normalized = '';
    try {
      normalized = validateMyanmarPhone(phone, 'ဖုန်းနံပါတ်');
      setPhone(normalized);
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      setPhoneMatches([]);
      return;
    }

    if (!session?.token) {
      return;
    }

    setCheckingPhone(true);
    try {
      const results = await lookupPhoneMatches(normalized);
      if (results.length === 1) {
        applyPhoneMatch(results[0]);
      } else if (results.length === 0) {
        setCreateContactPromptOpen(true);
      }
    } catch {
      // Manual check remains available.
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleCheckPhone = async () => {
    if (!session?.token) {
      return;
    }

    setPhoneError('');
    setPhoneMatches([]);
    setCreateContactPromptOpen(false);

    let normalized = '';
    try {
      normalized = validateMyanmarPhone(phone, 'ဖုန်းနံပါတ်');
      setPhone(normalized);
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      return;
    }

    setCheckingPhone(true);
    try {
      const results = await lookupPhoneMatches(normalized);
      if (results.length === 1) {
        applyPhoneMatch(results[0]);
      } else if (results.length === 0) {
        setCreateContactPromptOpen(true);
      }
    } catch (error) {
      setPhoneError(
        error instanceof Error ? error.message : 'Failed to search contacts.',
      );
    } finally {
      setCheckingPhone(false);
    }
  };

  const openAddAddressModal = async () => {
    setNewAddressError('');
    setNewAddressName('');
    setNewAddressPhone(phone);
    setNewAddressStreet('');
    setNewAddressStreet2('');
    setNewAddressTownship('');
    setNewAddressTownshipId('');
    setAddAddressOpen(true);

    if (!session?.token || townshipOptions.length > 0) {
      return;
    }

    try {
      const data = await fetchTownships(session.token);
      setTownshipOptions(data);
    } catch {
      setNewAddressError('Could not load townships.');
    }
  };

  const handleSaveNewAddress = async () => {
    if (!session?.token || !customer) {
      return;
    }

    const name = newAddressName.trim();
    if (!name) {
      setNewAddressError('Address name is required.');
      return;
    }

    const township =
      townshipOptions.find(item => item.id === newAddressTownshipId) ||
      townshipOptions.find(item => item.name === newAddressTownship);

    if (!township) {
      setNewAddressError('Please choose a township from the list.');
      return;
    }

    let addressPhone = newAddressPhone.trim();
    if (addressPhone) {
      try {
        addressPhone = validateMyanmarPhone(addressPhone, 'Phone number');
      } catch (error) {
        setNewAddressError(
          error instanceof Error ? error.message : 'Invalid phone number.',
        );
        return;
      }
    }

    setSavingAddress(true);
    setNewAddressError('');
    try {
      const created = await createCustomerAddress(session.token, customer.id, {
        name,
        phone: addressPhone || undefined,
        street: newAddressStreet.trim() || undefined,
        street2: newAddressStreet2.trim() || undefined,
        townshipId: township.id,
      });
      setAddresses(created.addresses);
      setShippingPartnerId(created.defaultAddressId);
      setAddAddressOpen(false);
    } catch (error) {
      setNewAddressError(
        error instanceof Error ? error.message : 'Failed to create address.',
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const selectedShippingAddress = addresses.find(
    address => address.id === shippingPartnerId,
  );

  const locationOptions = useMemo(
    () => [...addresses.map(address => address.label), ADD_NEW_ADDRESS_OPTION],
    [addresses],
  );

  const selectedLocationLabel =
    selectedShippingAddress?.label ||
    (loadingAddresses ? 'Loading addresses…' : 'Select location');


  useEffect(() => {
    if (!initialCustomerId) {
      return;
    }
    if (!skipDraftRestore && draftRestored) {
      return;
    }
    const match = customers.find(item => item.id === initialCustomerId);
    if (match) {
      selectCustomer(match);
      void loadAddressesForPartner(match.id, match);
      setTab(initialReorder ? 'products' : 'contact');
    }
  }, [initialCustomerId, customers, skipDraftRestore, draftRestored, initialReorder]);

  useEffect(() => {
    if (!initialReorder || products.length === 0) {
      if (!initialReorder) {
        reorderAppliedRef.current = null;
      }
      return;
    }
    if (!skipDraftRestore && draftRestored) {
      return;
    }

    const seedKey = initialReorder.lines.map(line => line.lineId).join(',');
    if (reorderAppliedRef.current === seedKey) {
      return;
    }
    reorderAppliedRef.current = seedKey;

    const orderLines: OrderLine[] = [];
    for (const seedLine of initialReorder.lines) {
      let product =
        products.find(item => item.id === seedLine.productId) ??
        products.find(
          item =>
            item.name.trim().toLowerCase() === seedLine.productName.trim().toLowerCase(),
        );

      if (!product) {
        continue;
      }

      orderLines.push({
        product,
        qty: seedLine.quantity,
        unitPrice: seedLine.unitPrice,
        discountPercent: seedLine.discountPercent,
      });
    }

    setLines(orderLines);

    if (initialReorder.phoneNumber) {
      setPhone(initialReorder.phoneNumber);
    }
    if (initialReorder.deliveryNote) {
      setDeliveryNote(initialReorder.deliveryNote);
    }
    if (initialReorder.preferredDeliveryDate) {
      setPreferredDeliveryDate(initialReorder.preferredDeliveryDate);
    }
    if (initialReorder.paymentMethodLineId) {
      setPaymentMethodLineId(initialReorder.paymentMethodLineId);
    }

    setTab('products');
    setPhoneMatches([]);
    setPhoneError('');
    setContactError('');
  }, [initialReorder, products, skipDraftRestore, draftRestored]);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) {
      return customers;
    }
    return customers.filter(
      item =>
        item.name.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.township.toLowerCase().includes(term),
    );
  }, [customers, customerSearch]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    products.forEach(item => {
      if (item.category) {
        unique.add(item.category);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter(item => {
      const matchesCategory = !category || item.category === category;
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [products, productSearch, category]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineAmount(line), 0),
    [lines],
  );

  const addProduct = (product: Product) => {
    setLines(prev => {
      const existing = prev.find(line => line.product.id === product.id);
      if (existing) {
        return prev.map(line =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line,
        );
      }
      return [
        ...prev,
        { product, qty: 1, unitPrice: product.price, discountPercent: 0 },
      ];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setLines(prev =>
      prev
        .map(line =>
          line.product.id === productId ? { ...line, qty } : line,
        )
        .filter(line => line.qty > 0),
    );
  };

  const setDiscount = (productId: string, discountPercent: number) => {
    setLines(prev =>
      prev.map(line =>
        line.product.id === productId ? { ...line, discountPercent } : line,
      ),
    );
  };

  const setUnitPrice = (productId: string, unitPrice: number) => {
    setLines(prev =>
      prev.map(line =>
        line.product.id === productId ? { ...line, unitPrice } : line,
      ),
    );
  };

  const removeLine = (productId: string) => {
    setLines(prev => prev.filter(line => line.product.id !== productId));
  };

  const handleSave = () => {
    setContactError('');

    if (!customer) {
      setContactError('Please select a customer.');
      setTab('contact');
      return;
    }

    if (!salePersonName.trim()) {
      setContactError('Sale person name is required.');
      setTab('contact');
      return;
    }

    if (!shippingPartnerId.trim()) {
      setContactError('Delivery location is required.');
      setTab('contact');
      return;
    }

    if (!paymentMethodLineId.trim()) {
      setContactError('Payment method is required.');
      setTab('contact');
      return;
    }

    if (lines.length === 0) {
      setContactError('Add at least one product before saving.');
      setTab('products');
      return;
    }

    let normalizedPhone = phone.trim();
    try {
      normalizedPhone = validateMyanmarPhone(phone, 'ဖုန်းနံပါတ်');
      setPhone(normalizedPhone);
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      setTab('contact');
      return;
    }

    if (!preferredDeliveryDate.trim()) {
      setContactError('Preferred delivery date is required.');
      setTab('contact');
      return;
    }

    if (!deliveryNote.trim()) {
      setContactError('Delivery notes are required.');
      setTab('contact');
      return;
    }

    if (session?.user?.id) {
      void clearQuotationDraft(session.user.id);
    }

    onSave({
      customer,
      shippingPartnerId,
      salePersonName: salePersonName.trim(),
      phoneNumber: normalizedPhone,
      deliveryNote,
      preferredDeliveryDate,
      paymentMethodLineId,
      lines,
      total,
    });
  };

  const canSave =
    !!customer &&
    !!salePersonName.trim() &&
    !!shippingPartnerId.trim() &&
    !!paymentMethodLineId.trim() &&
    lines.length > 0 &&
    !saving &&
    !loadingAddresses &&
    !phoneError &&
    !!phone.trim() &&
    !!preferredDeliveryDate.trim() &&
    !!deliveryNote.trim();

  const lineCount = lines.reduce((sum, line) => sum + line.qty, 0);

  const paymentMethodLabel =
    paymentMethods.find(method => method.id === paymentMethodLineId)?.name ?? '';

  const contactPanel = (
    <View style={styles.panelGap}>
      <View>
        <Text
          variant="labelMedium"
          style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
          Phone Number *
        </Text>
        <TextInput
          mode="outlined"
          placeholder="09xxxxxxxxx"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          error={!!phoneError}
          left={<TextInput.Icon icon="phone-outline" />}
        />
        {phoneError ? <HelperText type="error">{phoneError}</HelperText> : null}
        {customer ? (
          <HelperText type="info">
            Contact selected: {customer.name}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </HelperText>
        ) : null}
        {checkingPhone ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Checking phone number...
          </Text>
        ) : null}
        <Button
          mode="contained-tonal"
          icon="account-search-outline"
          loading={checkingPhone}
          disabled={checkingPhone || !phone.trim()}
          onPress={handleCheckPhone}
          style={styles.checkPhoneButton}>
          Check / Select Contact
        </Button>
      </View>

      {phoneMatches.length > 0 ? (
        <View style={styles.matchesSection}>
          <Text variant="titleSmall" style={{ fontWeight: '600' }}>
            Existing contacts found
          </Text>
          {phoneMatches.map(match => (
            <Card key={match.id} style={styles.matchCard}>
              <Card.Content>
                <Text variant="titleMedium">{match.name}</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {match.phone || '—'}
                </Text>
                {[match.township, match.city].filter(Boolean).length ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {[match.township, match.city].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
                <Button
                  mode="outlined"
                  compact
                  style={styles.useContactButton}
                  onPress={() => applyPhoneMatch(match)}>
                  Use This Contact
                </Button>
              </Card.Content>
            </Card>
          ))}
        </View>
      ) : null}

      <View>
        <Text
          variant="labelMedium"
          style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
          Customer *
        </Text>
        <Pressable
          onPress={() => setCustomerPickerOpen(true)}
          style={[
            styles.selectField,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <Icon
            source="account-outline"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <CustomerNameText style={{ flex: 1 }}>
            {customer ? customer.name : 'Select a customer'}
          </CustomerNameText>
          <Icon
            source="chevron-down"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      <View>
        <DropdownField
          label="Sale Person Name *"
          placeholder="Select sale person"
          value={salePersonName}
          options={[...SALE_PERSON_OPTIONS]}
          sortOptions={false}
          showClearOption={false}
          onChange={value => {
            setSalePersonName(value);
            setContactError('');
          }}
        />
        {contactError && !salePersonName.trim() ? (
          <HelperText type="error">{contactError}</HelperText>
        ) : null}
      </View>

      {customer ? (
        <View style={styles.panelGap}>
          <DropdownField
            label="Delivery Location *"
            placeholder={loadingAddresses ? 'Loading addresses…' : 'Select location'}
            value={selectedLocationLabel}
            options={locationOptions}
            sortOptions={false}
            showClearOption={false}
            onChange={label => {
              if (label === ADD_NEW_ADDRESS_OPTION) {
                void openAddAddressModal();
                return;
              }
              const match = addresses.find(address => address.label === label);
              if (match) {
                setShippingPartnerId(match.id);
                setContactError('');
              }
            }}
          />
          {loadingAddresses ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Loading delivery addresses…
            </Text>
          ) : null}
          {addressError ? <HelperText type="error">{addressError}</HelperText> : null}
          {contactError && !shippingPartnerId.trim() ? (
            <HelperText type="error">{contactError}</HelperText>
          ) : null}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            <View style={styles.infoRow}>
              <Icon source="map-marker-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                {addressDisplay(selectedShippingAddress)}
              </Text>
            </View>
          </View>
          <Button
            mode="text"
            compact
            icon="plus"
            onPress={() => {
              void openAddAddressModal();
            }}>
            Add new address
          </Button>
        </View>
      ) : null}

      <View>
        <DropdownField
          label="Payment Method *"
          placeholder="Select payment method"
          value={paymentMethodLabel}
          options={paymentMethods.map(method => method.name)}
          onChange={label => {
            const match = paymentMethods.find(method => method.name === label);
            setPaymentMethodLineId(match?.id ?? '');
            setContactError('');
          }}
          sortOptions={false}
          showClearOption={false}
        />
        {paymentMethods.length === 0 ? (
          <HelperText type="info">
            Payment methods could not be loaded. Restart the backend with the latest
            update, then open New Quotation again.
          </HelperText>
        ) : null}
        {contactError && !paymentMethodLineId.trim() ? (
          <HelperText type="error">{contactError}</HelperText>
        ) : null}
      </View>

      <View>
        <CalendarField
          label="Preferred Delivery Date *"
          value={preferredDeliveryDate}
          onChange={value => {
            setPreferredDeliveryDate(value);
            setContactError('');
          }}
          placeholder="Select preferred delivery date"
        />
      </View>

      <View>
        <View style={styles.fieldLabelRow}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}>
            Delivery Notes *
          </Text>
          <VoiceInputButton
            listening={isListening}
            supported={isVoiceSupported}
            secondsLeft={secondsLeft}
            onPress={toggleVoiceInput}
          />
        </View>
        <TextInput
          mode="outlined"
          placeholder="Delivery instructions..."
          value={isListening ? liveDeliveryNote : deliveryNote}
          onChangeText={value => {
            setDeliveryNote(value);
            setVoiceBase('');
            setVoiceFinals('');
            setSpeechError('');
            setContactError('');
            if (isListening) {
              stopVoiceInput();
            }
          }}
          multiline
          numberOfLines={3}
          error={!!contactError && !deliveryNote.trim()}
        />
        {isListening ? (
          <View style={styles.voiceStatus}>
            <View
              style={[
                styles.voiceProgressTrack,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}>
              <View
                style={[
                  styles.voiceProgressFill,
                  {
                    backgroundColor: theme.colors.error,
                    width: `${Math.max((secondsLeft / VOICE_MAX_SECONDS) * 100, 4)}%`,
                  },
                ]}
              />
            </View>
            <HelperText type="info" style={styles.voiceHint}>
              Listening… {secondsLeft}s left. Pause briefly between phrases for clearer
              Myanmar text.
            </HelperText>
          </View>
        ) : null}
        {speechError ? <HelperText type="error">{speechError}</HelperText> : null}
      </View>

      {contactError ? <HelperText type="error">{contactError}</HelperText> : null}
    </View>
  );

  const outline = theme.colors.outlineVariant ?? theme.colors.outline;

  const renderProductListRow = (product: Product) => {
    const inCart = lines.find(line => line.product.id === product.id);
    return (
      <Pressable
        key={product.id}
        onPress={() => addProduct(product)}
        style={({ hovered, pressed }) => [
          styles.productRow,
          { borderBottomColor: outline },
          hovered && { backgroundColor: theme.colors.primaryContainer },
          pressed && { opacity: 0.85 },
        ]}>
        <ProductThumb uri={product.image} size={48} />
        <View style={styles.flex1}>
          <Text numberOfLines={1} style={{ fontWeight: '600' }}>
            {product.name}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}>
            {product.sku || '—'} · {formatMoney(product.price)} · Stock{' '}
            {product.stock}
          </Text>
        </View>
        {inCart ? (
          <View style={styles.qtyPill}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
              {inCart.qty}
            </Text>
          </View>
        ) : (
          <Icon source="plus-circle" size={24} color={theme.colors.primary} />
        )}
      </Pressable>
    );
  };

  const renderProductCard = (product: Product) => {
    const inCart = lines.find(line => line.product.id === product.id);
    return (
      <Pressable
        key={product.id}
        onPress={() => addProduct(product)}
        style={({ hovered, pressed }) => [
          styles.pickCard,
          {
            backgroundColor: inCart
              ? theme.colors.primaryContainer
              : theme.colors.surface,
            borderColor: inCart ? theme.colors.primary : outline,
          },
          hovered && {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.primaryContainer,
            transform: [{ translateY: -3 }],
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          pressed && { opacity: 0.9 },
        ]}>
        <ProductThumb uri={product.image} size={72} style={styles.pickCardImage} />
        <View style={styles.pickCardTop}>
          <Text numberOfLines={2} style={styles.pickCardName}>
            {product.name}
          </Text>
          {inCart ? (
            <View style={styles.qtyPill}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                {inCart.qty}
              </Text>
            </View>
          ) : (
            <Icon source="plus-circle" size={22} color={theme.colors.primary} />
          )}
        </View>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant }}>
          {product.sku || 'No SKU'}
        </Text>
        <View style={styles.pickCardFooter}>
          <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
            {formatMoney(product.price)}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}>
            Stock {product.stock}
          </Text>
        </View>
      </Pressable>
    );
  };

  const productsPanel = (
    <View style={styles.panelGap}>
      <View style={styles.searchRow}>
        <View style={styles.flex1}>
          <TextInput
            mode="outlined"
            placeholder="Search products by name or SKU"
            value={productSearch}
            onChangeText={setProductSearch}
            left={<TextInput.Icon icon="magnify" />}
            dense
          />
        </View>
        <View style={[styles.viewToggle, { borderColor: outline }]}>
          <IconButton
            icon="format-list-bulleted"
            size={20}
            mode={productView === 'list' ? 'contained' : undefined}
            onPress={() => setProductView('list')}
            style={styles.viewToggleBtn}
          />
          <IconButton
            icon="view-grid-outline"
            size={20}
            mode={productView === 'card' ? 'contained' : undefined}
            onPress={() => setProductView('card')}
            style={styles.viewToggleBtn}
          />
        </View>
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}>
          <Chip
            mode={category === '' ? 'flat' : 'outlined'}
            selected={category === ''}
            showSelectedCheck={false}
            onPress={() => setCategory('')}
            style={styles.categoryChip}>
            All
          </Chip>
          {categories.map(cat => (
            <Chip
              key={cat}
              mode={category === cat ? 'flat' : 'outlined'}
              selected={category === cat}
              showSelectedCheck={false}
              onPress={() => setCategory(cat)}
              style={styles.categoryChip}>
              {cat}
            </Chip>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.productList, { borderColor: outline }]}>
        <ScrollView
          style={styles.productScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled>
          {productsLoading && products.length === 0 ? (
            <View style={styles.productsLoading}>
              <ActivityIndicator />
              <Text style={{ marginTop: 12 }}>Loading products…</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>No products found.</Text>
          ) : productView === 'list' ? (
            filteredProducts.map(renderProductListRow)
          ) : (
            <View style={styles.cardGrid}>
              {filteredProducts.map(renderProductCard)}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );

  const orderSummary = (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.summaryHeader}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Order Lines
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {lineCount} item{lineCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Divider />

      <View style={styles.orderLinesBody} onLayout={handleOrderPanelLayout}>
        {lines.length > 0 && orderLineVariant === 'table' ? (
          <View style={styles.orderTable}>
            <View
              style={[
                styles.orderTableHeader,
                { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
              ]}>
              <View style={styles.orderColProduct}>
                <Text variant="labelSmall" style={styles.orderHeaderText} numberOfLines={1}>
                  Product
                </Text>
              </View>
              <View style={[styles.orderColFixed, { width: tableColWidths.qty }]}>
                <Text variant="labelSmall" style={[styles.orderHeaderText, styles.orderHeaderQtyText]}>
                  Qty
                </Text>
              </View>
              <View style={[styles.orderColFixed, { width: tableColWidths.price }]}>
                <Text variant="labelSmall" style={[styles.orderHeaderText, styles.orderHeaderNumericText]}>
                  Price
                </Text>
              </View>
              <View style={[styles.orderColFixed, { width: tableColWidths.disc }]}>
                <Text variant="labelSmall" style={[styles.orderHeaderText, styles.orderHeaderNumericText]}>
                  Disc
                </Text>
              </View>
              <View style={[styles.orderColFixed, { width: tableColWidths.amount }]}>
                <Text variant="labelSmall" style={[styles.orderHeaderText, styles.orderHeaderNumericText]}>
                  Amount
                </Text>
              </View>
              <View style={[styles.orderColFixed, { width: tableColWidths.delete }]} />
            </View>

            <ScrollView
              style={styles.summaryScroll}
              showsVerticalScrollIndicator={Platform.OS === 'web'}
              nestedScrollEnabled>
              {lines.map(line => (
                <OrderLineRow
                  key={line.product.id}
                  variant="table"
                  colWidths={tableColWidths}
                  line={line}
                  onQtyChange={setQty}
                  onUnitPriceChange={setUnitPrice}
                  onDiscountChange={setDiscount}
                  onRemove={removeLine}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            style={styles.summaryScroll}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            nestedScrollEnabled>
            {lines.length === 0 ? (
              <View style={styles.summaryEmpty}>
                <Icon
                  source="cart-outline"
                  size={40}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    textAlign: 'center',
                    marginTop: 8,
                  }}>
                  No products selected yet. Add products from the Products tab.
                </Text>
              </View>
            ) : (
              lines.map(line => (
                <OrderLineRow
                  key={line.product.id}
                  variant="card"
                  line={line}
                  onQtyChange={setQty}
                  onUnitPriceChange={setUnitPrice}
                  onDiscountChange={setDiscount}
                  onRemove={removeLine}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>

      <Divider />
      <View style={styles.totalRow}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Total
        </Text>
        <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '800' }}>
          {formatMoney(total)}
        </Text>
      </View>
    </View>
  );

  const mainPanel = (
    <>
      <SegmentedButtons
        value={tab}
        onValueChange={value => setTab(value as 'contact' | 'products')}
        buttons={[
          { value: 'contact', label: 'Contact', icon: 'account' },
          {
            value: 'products',
            label: `Products${lineCount ? ` (${lineCount})` : ''}`,
            icon: 'package-variant-closed',
          },
        ]}
        style={styles.tabs}
      />
      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        {tab === 'contact' ? contactPanel : productsPanel}
      </ScrollView>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View
        style={[
          styles.topBar,
          { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
        ]}>
        <View style={styles.topBarLeft}>
          <IconButton icon="arrow-left" size={22} onPress={onDiscard} />
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            New Quotation
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <Button mode="outlined" onPress={onDiscard} disabled={saving}>
            Discard
          </Button>
          <Button
            mode="contained"
            icon="content-save"
            disabled={!canSave}
            loading={saving}
            onPress={handleSave}>
            Save
          </Button>
        </View>
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      ) : null}

      {draftRestored ? (
        <View
          style={[
            styles.draftBanner,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}>
          <Text variant="bodySmall" style={styles.flex1}>
            Draft restored from your last session.
          </Text>
          <Button compact onPress={dismissRestoredNotice}>
            Dismiss
          </Button>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Loading customers…</Text>
        </View>
      ) : (
        <View
          style={[styles.body, isDesktop ? styles.bodyRow : styles.bodyColumn]}
          onLayout={handleBodyLayout}>
          {Platform.OS === 'web' ? (
            isDesktop ? (
              <>
                <View style={[styles.resizableLeftPanel, { width: leftPanelWidth }]}>
                  {mainPanel}
                </View>
                <ResizableDivider
                  orientation="vertical"
                  onDrag={desktopSplit.applyDragDelta}
                  onDragEnd={desktopSplit.handleDragEnd}
                />
                <View style={styles.resizableRightPanel}>{orderSummary}</View>
              </>
            ) : (
              <>
                <View style={[styles.resizableTopPanel, { height: topPanelHeight }]}>
                  {mainPanel}
                </View>
                <ResizableDivider
                  orientation="horizontal"
                  onDrag={mobileSplit.applyDragDelta}
                  onDragEnd={mobileSplit.handleDragEnd}
                />
                <View style={styles.resizableBottomPanel}>{orderSummary}</View>
              </>
            )
          ) : (
            <>
              <View style={isDesktop ? styles.leftColumn : styles.leftColumnMobile}>
                {mainPanel}
              </View>
              <View style={isDesktop ? styles.rightColumn : styles.rightColumnMobile}>
                {orderSummary}
              </View>
            </>
          )}
        </View>
      )}

      <Portal>
        <Modal
          visible={customerPickerOpen}
          onDismiss={() => setCustomerPickerOpen(false)}
          contentContainerStyle={[
            styles.pickerModal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <Text variant="titleMedium" style={styles.pickerTitle}>
            Select Customer
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Search customers"
            value={customerSearch}
            onChangeText={setCustomerSearch}
            left={<TextInput.Icon icon="magnify" />}
            dense
            autoFocus
          />
          <ScrollView
            style={styles.pickerList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled>
            {filteredCustomers.length === 0 ? (
              <Text style={styles.emptyText}>No customers found.</Text>
            ) : (
              filteredCustomers.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    selectCustomer(item);
                    setCustomerPickerOpen(false);
                    void loadAddressesForPartner(item.id, item);
                    setCustomerSearch('');
                  }}
                  style={[
                    styles.pickerRow,
                    {
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  <Text style={{ fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                    numberOfLines={1}>
                    {[item.phone, customerAddress(item)]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Button onPress={() => setCustomerPickerOpen(false)}>Close</Button>
        </Modal>
      </Portal>

      <Portal>
        <Dialog
          visible={createContactPromptOpen}
          onDismiss={() => setCreateContactPromptOpen(false)}>
          <Dialog.Title>Create new contact?</Dialog.Title>
          <Dialog.Content>
            <Text>
              No contact was found for {phone || 'this phone number'}. Do you want to
              create a new contact?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateContactPromptOpen(false)}>No</Button>
            <Button
              onPress={() => {
                setCreateContactPromptOpen(false);
                setCreateContactOpen(true);
              }}>
              Yes, create contact
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Modal
          visible={createContactOpen}
          onDismiss={() => setCreateContactOpen(false)}
          contentContainerStyle={[
            styles.createContactModal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <CreateContactView
            embedded
            initialPhone={phone}
            onCancel={() => setCreateContactOpen(false)}
            onCreated={created => {
              setCreateContactOpen(false);
              selectCustomer(created);
              void loadAddressesForPartner(created.id, created);
            }}
          />
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={addAddressOpen}
          onDismiss={() => setAddAddressOpen(false)}
          contentContainerStyle={[
            styles.addAddressModal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 12 }}>
            Add delivery address
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Creates a new address under {customer?.name || 'this customer'}.
          </Text>
          <TextInput
            mode="outlined"
            label="Address name *"
            value={newAddressName}
            onChangeText={setNewAddressName}
            style={{ marginBottom: 10 }}
          />
          <TextInput
            mode="outlined"
            label="Phone"
            value={newAddressPhone}
            onChangeText={setNewAddressPhone}
            keyboardType="phone-pad"
            style={{ marginBottom: 10 }}
          />
          <TextInput
            mode="outlined"
            label="Address 1"
            value={newAddressStreet}
            onChangeText={setNewAddressStreet}
            style={{ marginBottom: 10 }}
          />
          <TextInput
            mode="outlined"
            label="Address 2"
            value={newAddressStreet2}
            onChangeText={setNewAddressStreet2}
            style={{ marginBottom: 10 }}
          />
          <SearchableDropdownField
            label="Township *"
            value={newAddressTownship}
            options={townshipOptions.map(item => item.name).sort((a, b) => a.localeCompare(b))}
            onChange={name => {
              const match = townshipOptions.find(item => item.name === name);
              setNewAddressTownship(name);
              setNewAddressTownshipId(match?.id ?? '');
            }}
            placeholder="Search township"
          />
          {newAddressError ? (
            <HelperText type="error">{newAddressError}</HelperText>
          ) : null}
          <View style={styles.addAddressActions}>
            <Button disabled={savingAddress} onPress={() => setAddAddressOpen(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={savingAddress}
              disabled={savingAddress}
              onPress={() => {
                void handleSaveNewAddress();
              }}>
              Save address
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  draftBanner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createContactModal: {
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '92%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flex: 1,
  },
  addAddressModal: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  addAddressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsLoading: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyRow: {
    flexDirection: 'row',
    flex: 1,
    minHeight: 0,
  },
  bodyColumn: {
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  resizableLeftPanel: {
    flexShrink: 0,
    minHeight: 0,
    minWidth: 280,
    overflow: 'hidden',
  },
  resizableRightPanel: {
    flex: 1,
    minHeight: 0,
    minWidth: 300,
    padding: 12,
  },
  resizableTopPanel: {
    flexShrink: 0,
    minHeight: 200,
    overflow: 'hidden',
  },
  resizableBottomPanel: {
    flex: 1,
    minHeight: 240,
    padding: 12,
  },
  leftColumn: {
    flex: 1.5,
  },
  leftColumnMobile: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    padding: 12,
  },
  rightColumnMobile: {
    flex: 1,
    padding: 12,
    minHeight: 360,
  },
  tabs: {
    margin: 12,
  },
  panelScroll: {
    flex: 1,
  },
  panelContent: {
    padding: 12,
    paddingTop: 0,
  },
  panelGap: {
    gap: 16,
  },
  fieldLabel: {
    marginBottom: 6,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voiceStatus: {
    marginTop: 2,
    gap: 2,
  },
  voiceProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  voiceProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  voiceHint: {
    paddingHorizontal: 0,
  },
  checkPhoneButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  matchesSection: {
    gap: 10,
  },
  matchCard: {
    borderRadius: 10,
  },
  useContactButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
  },
  productList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 420,
  },
  productScroll: {
    maxHeight: 420,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  qtyPill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  categoryChip: {
    marginRight: 0,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
  },
  viewToggleBtn: {
    margin: 0,
    borderRadius: 8,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
  },
  pickCard: {
    flexGrow: 1,
    flexBasis: 160,
    maxWidth: 240,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  pickCardImage: {
    alignSelf: 'center',
    width: '100%',
    height: 72,
    borderRadius: 8,
  },
  pickCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  pickCardName: {
    flex: 1,
    fontWeight: '700',
    minHeight: 38,
  },
  pickCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 280,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  orderLinesBody: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  orderTable: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  summaryScroll: {
    flex: 1,
    minHeight: 0,
  },
  summaryEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  orderTableHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: TABLE_COL_GAP,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orderHeaderText: {
    fontWeight: '700',
    opacity: 0.75,
  },
  orderHeaderQtyText: {
    textAlign: 'center',
    width: '100%',
  },
  orderHeaderNumericText: {
    textAlign: 'right',
    width: '100%',
  },
  orderColProduct: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  orderColFixed: {
    flexShrink: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orderLineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: TABLE_COL_GAP,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orderLineCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  orderLineCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  orderLineCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  orderLineCardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderCardField: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 140,
  },
  orderCardFieldLabel: {
    marginBottom: 4,
    opacity: 0.75,
  },
  orderCardFieldInput: {
    height: 40,
    width: '100%',
  },
  orderCardQty: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    width: '100%',
  },
  orderCardQtyInput: {
    flex: 1,
    height: 40,
    minWidth: 56,
  },
  orderProductCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  orderProductName: {
    flex: 1,
    fontWeight: '600',
    minWidth: 0,
  },
  qtyStepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  compactStepBtn: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  qtyStepperInput: {
    flex: 1,
    height: 30,
    minWidth: 36,
  },
  qtyStepperInputCompact: {
    minWidth: 30,
  },
  orderPriceInput: {
    height: 30,
  },
  orderDiscInput: {
    height: 30,
  },
  orderInputOutline: {
    borderRadius: 6,
  },
  orderInputContent: {
    fontSize: 13,
    paddingVertical: 0,
    textAlign: 'right',
  },
  orderInputContentCompact: {
    fontSize: 12,
    minHeight: 0,
    paddingHorizontal: 2,
    paddingVertical: 0,
    textAlign: 'center',
  },
  orderInputContentCompactRight: {
    fontSize: 12,
    minHeight: 0,
    paddingHorizontal: 4,
    paddingVertical: 0,
    textAlign: 'right',
  },
  orderAmountText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    width: '100%',
  },
  orderDeleteBtn: {
    height: 28,
    margin: 0,
    width: 28,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  pickerModal: {
    alignSelf: 'center',
    width: 460,
    maxWidth: '92%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  pickerTitle: {
    fontWeight: '700',
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    padding: 20,
  },
});
