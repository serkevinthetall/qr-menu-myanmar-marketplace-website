import { useCallback, useEffect, useRef, useState } from 'react';

import { OrderLine } from '@/components/quotation/QuotationBuilder';
import { Customer } from '@/types/customer';
import {
  hasStoredDraftContent,
  loadQuotationDraft,
  saveQuotationDraft,
  StoredQuotationDraft,
} from '@/utils/quotation-draft-storage';

const SAVE_DEBOUNCE_MS = 500;

type DraftFormState = {
  tab: 'contact' | 'products';
  customer: Customer | null;
  phone: string;
  salePersonName: string;
  deliveryNote: string;
  preferredDeliveryDate: string;
  paymentMethodLineId: string;
  lines: OrderLine[];
  productSearch: string;
  productView: 'list' | 'card';
  category: string;
};

type UseQuotationDraftPersistenceOptions = {
  userId?: string;
  skipRestore?: boolean;
  enabled?: boolean;
  form: DraftFormState;
  onRestore: (draft: StoredQuotationDraft) => void;
};

export function useQuotationDraftPersistence({
  userId,
  skipRestore = false,
  enabled = true,
  form,
  onRestore,
}: UseQuotationDraftPersistenceOptions) {
  const [draftRestored, setDraftRestored] = useState(false);
  const restoreCheckedRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  const formRef = useRef(form);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    if (!userId || !enabled || skipRestore || restoreCheckedRef.current) {
      return;
    }

    restoreCheckedRef.current = true;
    let cancelled = false;

    loadQuotationDraft(userId).then(draft => {
      if (cancelled || !draft || !hasStoredDraftContent(draft)) {
        return;
      }

      onRestoreRef.current(draft);
      setDraftRestored(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, enabled, skipRestore]);

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const timer = setTimeout(() => {
      const current = formRef.current;
      void saveQuotationDraft(userId, {
        resumeBuilder: true,
        tab: current.tab,
        customer: current.customer,
        phone: current.phone,
        salePersonName: current.salePersonName,
        deliveryNote: current.deliveryNote,
        preferredDeliveryDate: current.preferredDeliveryDate,
        paymentMethodLineId: current.paymentMethodLineId,
        lines: current.lines,
        productSearch: current.productSearch,
        productView: current.productView,
        category: current.category,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [userId, enabled, form]);

  const dismissRestoredNotice = useCallback(() => {
    setDraftRestored(false);
  }, []);

  return { draftRestored, dismissRestoredNotice };
}
