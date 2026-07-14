import AsyncStorage from '@react-native-async-storage/async-storage';

import { OrderLine } from '@/components/quotation/QuotationBuilder';
import { Customer } from '@/types/customer';

const DRAFT_STORAGE_PREFIX = '@qr_shop_quotation_draft';

export type StoredQuotationDraft = {
  version: 1;
  savedAt: string;
  resumeBuilder: boolean;
  tab: 'contact' | 'products';
  customer: Customer | null;
  phone: string;
  salePersonName?: string;
  deliveryNote: string;
  preferredDeliveryDate: string;
  paymentMethodLineId: string;
  lines: OrderLine[];
  productSearch: string;
  productView: 'list' | 'card';
  category: string;
};

function storageKey(userId: string): string {
  return `${DRAFT_STORAGE_PREFIX}_${userId}`;
}

export function hasStoredDraftContent(draft: StoredQuotationDraft): boolean {
  return (
    Boolean(draft.customer) ||
    draft.lines.length > 0 ||
    draft.phone.trim().length > 0 ||
    draft.deliveryNote.trim().length > 0 ||
    draft.preferredDeliveryDate.trim().length > 0 ||
    draft.paymentMethodLineId.trim().length > 0
  );
}

export async function loadQuotationDraft(
  userId: string,
): Promise<StoredQuotationDraft | null> {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as StoredQuotationDraft;
    if (parsed.version !== 1) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveQuotationDraft(
  userId: string,
  draft: Omit<StoredQuotationDraft, 'version' | 'savedAt'>,
): Promise<void> {
  const payload: StoredQuotationDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    ...draft,
  };

  if (!hasStoredDraftContent(payload)) {
    await clearQuotationDraft(userId);
    return;
  }

  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

export async function clearQuotationDraft(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}

export async function shouldResumeQuotationDraft(userId: string): Promise<boolean> {
  const draft = await loadQuotationDraft(userId);
  return Boolean(draft?.resumeBuilder && hasStoredDraftContent(draft));
}
