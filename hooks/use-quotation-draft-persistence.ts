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

function isFormDirty(form: DraftFormState): boolean {
  return (
    Boolean(form.customer) ||
    form.lines.length > 0 ||
    form.phone.trim().length > 0 ||
    form.salePersonName.trim().length > 0 ||
    form.deliveryNote.trim().length > 0 ||
    form.preferredDeliveryDate.trim().length > 0 ||
    form.paymentMethodLineId.trim().length > 0 ||
    form.productSearch.trim().length > 0
  );
}

export function useQuotationDraftPersistence({
  userId,
  skipRestore = false,
  enabled = true,
  form,
  onRestore,
}: UseQuotationDraftPersistenceOptions) {
  const [draftRestored, setDraftRestored] = useState(false);
  const restoreCheckedRef = useRef(false);
  const restoreSettledRef = useRef(false);
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
      if (skipRestore || !enabled) {
        restoreSettledRef.current = true;
      }
      return;
    }

    restoreCheckedRef.current = true;
    let cancelled = false;

    loadQuotationDraft(userId)
      .then(draft => {
        if (cancelled) {
          return;
        }
        if (!draft || !hasStoredDraftContent(draft)) {
          return;
        }

        // User already typed / added a product while restore was in flight —
        // do not wipe their work with a stale draft.
        if (isFormDirty(formRef.current)) {
          return;
        }

        onRestoreRef.current(draft);
        setDraftRestored(true);
      })
      .finally(() => {
        if (!cancelled) {
          restoreSettledRef.current = true;
        }
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
      // Wait until restore attempt finished so we don't save an empty form
      // over a draft before restore can run.
      if (!restoreSettledRef.current && !skipRestore) {
        return;
      }

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
  }, [userId, enabled, form, skipRestore]);

  const dismissRestoredNotice = useCallback(() => {
    setDraftRestored(false);
  }, []);

  return { draftRestored, dismissRestoredNotice };
}
