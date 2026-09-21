import { useFocusEffect } from 'expo-router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { PrintFormat } from '@/utils/print-quotation';

const SEARCH_DEBOUNCE_MS = 350;

export type HeaderAction = {
  key: string;
  icon?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /** When set, renders a text button instead of an icon-only button. */
  label?: string;
  /** Highlight a toggle-style label button as selected. */
  active?: boolean;
};

export type DetailHeader = {
  title: string;
  onBack: () => void;
  statusLabel?: string;
  breadcrumbParent?: string;
  onPrint?: (format: PrintFormat) => void;
  onCreateQuotation?: () => void;
  /** Confirm quotation → sales order — shown beside Print. */
  onConfirm?: () => void;
  confirming?: boolean;
  /** Validate Odoo delivery (stock.picking) — shown beside Print/Confirm. */
  onValidateDelivery?: () => void;
  validatingDelivery?: boolean;
  /**
   * Odoo Delivery smart button — opens delivery preview (e.g. WH/OUT/…)
   * even when already Done / not validatable.
   */
  onOpenDelivery?: () => void;
  deliveryCount?: number;
  /** Odoo Invoice smart button — opens invoice list when invoices exist. */
  onOpenInvoices?: () => void;
  invoiceCount?: number;
  /**
   * Create Odoo customer invoice — only when sale/done + to invoice
   * and typically when no invoices yet (Odoo Create Invoice).
   */
  onCreateInvoice?: () => void;
  creatingInvoice?: boolean;
  /** Register payment on unpaid invoice — shown beside Print/Invoice. */
  onPayInvoice?: () => void;
  payingInvoice?: boolean;
  /** Cancel draft quotation — shown on the right of the detail navbar. */
  onCancel?: () => void;
  cancelling?: boolean;
};

type SearchInputContextValue = {
  /** Immediate header input value; may lead the debounced `query`. */
  inputQuery: string;
  setInputQuery: (value: string) => void;
  placeholder: string;
  visible: boolean;
};

type SearchQueryContextValue = {
  /** Debounced query used for filtering / server search. */
  query: string;
  setQuery: (value: string) => void;
  enableSearch: (placeholder: string) => void;
  disableSearch: () => void;
};

type SearchChromeContextValue = {
  detailHeader: DetailHeader | null;
  setDetailHeader: (header: DetailHeader | null) => void;
  actions: HeaderAction[];
  setActions: (actions: HeaderAction[]) => void;
  filtersEnabled: boolean;
  filtersExpanded: boolean;
  setFiltersExpanded: (expanded: boolean) => void;
  filterPanel: ReactNode | null;
  setFilterPanel: (panel: ReactNode | null) => void;
  enableFilters: (panel: ReactNode) => void;
  unregisterFilters: () => void;
  disableFilters: () => void;
};

const SearchInputContext = createContext<SearchInputContextValue | null>(null);
const SearchQueryContext = createContext<SearchQueryContextValue | null>(null);
const SearchChromeContext = createContext<SearchChromeContextValue | null>(null);

/**
 * Holds navbar state shared between the header and the focused screen.
 * Input keystrokes update a separate context so list screens only re-render
 * when the debounced `query` changes (not on every character).
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState('');
  const [inputQuery, setInputQueryState] = useState('');
  const [placeholder, setPlaceholder] = useState('Search');
  const [visible, setVisible] = useState(false);
  const [actions, setActions] = useState<HeaderAction[]>([]);
  const [detailHeader, setDetailHeader] = useState<DetailHeader | null>(null);
  const [filtersEnabled, setFiltersEnabled] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterPanel, setFilterPanel] = useState<ReactNode | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearchDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const setInputQuery = useCallback(
    (value: string) => {
      setInputQueryState(value);
      clearSearchDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        setQueryState(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [clearSearchDebounce],
  );

  const setQuery = useCallback(
    (value: string) => {
      clearSearchDebounce();
      setInputQueryState(value);
      setQueryState(value);
    },
    [clearSearchDebounce],
  );

  useEffect(() => () => clearSearchDebounce(), [clearSearchDebounce]);

  const enableSearch = useCallback((nextPlaceholder: string) => {
    setPlaceholder(nextPlaceholder);
    setVisible(true);
  }, []);

  const disableSearch = useCallback(() => {
    clearSearchDebounce();
    setVisible(false);
    setInputQueryState('');
    setQueryState('');
    setFiltersEnabled(false);
    setFiltersExpanded(false);
    setFilterPanel(null);
  }, [clearSearchDebounce]);

  const enableFilters = useCallback((panel: ReactNode) => {
    setFilterPanel(panel);
    setFiltersEnabled(true);
  }, []);

  /** Removes filter UI when leaving a screen — does not collapse the panel. */
  const unregisterFilters = useCallback(() => {
    setFiltersEnabled(false);
    setFilterPanel(null);
  }, []);

  /** Clears filters and collapses the panel (e.g. leaving the module). */
  const disableFilters = useCallback(() => {
    unregisterFilters();
    setFiltersExpanded(false);
  }, [unregisterFilters]);

  const inputValue = useMemo<SearchInputContextValue>(
    () => ({
      inputQuery,
      setInputQuery,
      placeholder,
      visible,
    }),
    [inputQuery, setInputQuery, placeholder, visible],
  );

  const queryValue = useMemo<SearchQueryContextValue>(
    () => ({
      query,
      setQuery,
      enableSearch,
      disableSearch,
    }),
    [query, setQuery, enableSearch, disableSearch],
  );

  const chromeValue = useMemo<SearchChromeContextValue>(
    () => ({
      detailHeader,
      setDetailHeader,
      actions,
      setActions,
      filtersEnabled,
      filtersExpanded,
      setFiltersExpanded,
      filterPanel,
      setFilterPanel,
      enableFilters,
      unregisterFilters,
      disableFilters,
    }),
    [
      detailHeader,
      actions,
      filtersEnabled,
      filtersExpanded,
      filterPanel,
      enableFilters,
      unregisterFilters,
      disableFilters,
    ],
  );

  return (
    <SearchChromeContext.Provider value={chromeValue}>
      <SearchQueryContext.Provider value={queryValue}>
        <SearchInputContext.Provider value={inputValue}>
          {children}
        </SearchInputContext.Provider>
      </SearchQueryContext.Provider>
    </SearchChromeContext.Provider>
  );
}

function useSearchInputContext() {
  const context = useContext(SearchInputContext);
  if (!context) {
    throw new Error('useSearchInput must be used within SearchProvider');
  }
  return context;
}

function useSearchQueryContext() {
  const context = useContext(SearchQueryContext);
  if (!context) {
    throw new Error('useSearchQuery must be used within SearchProvider');
  }
  return context;
}

function useSearchChromeContext() {
  const context = useContext(SearchChromeContext);
  if (!context) {
    throw new Error('useSearchChrome must be used within SearchProvider');
  }
  return context;
}

/** Header search field — subscribes to keystrokes without re-rendering list screens. */
export function useSearchInput() {
  return useSearchInputContext();
}

/** Navbar chrome (actions / filters / detail) + debounced query — not keystrokes. */
export function useSearch() {
  const query = useSearchQueryContext();
  const chrome = useSearchChromeContext();
  return useMemo(
    () => ({
      ...query,
      ...chrome,
    }),
    [query, chrome],
  );
}

/** Safe for Portal/modals that may render outside SearchProvider. */
export function useOptionalSearch() {
  const query = useContext(SearchQueryContext);
  const chrome = useContext(SearchChromeContext);
  return useMemo(() => {
    if (!query || !chrome) {
      return null;
    }
    return {
      ...query,
      ...chrome,
    };
  }, [query, chrome]);
}

/**
 * Enables the navbar search bar while the calling screen is focused and
 * returns the debounced query for local filtering / server search.
 * Does not re-render on each keystroke — only when the debounced query updates.
 */
export function useModuleSearch(placeholder: string, enabled = true) {
  const { query, enableSearch, disableSearch } = useSearchQueryContext();
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (enabled) {
        enableSearch(placeholderRef.current);
        return () => {
          focusedRef.current = false;
          disableSearch();
        };
      }
      disableSearch();
      return () => {
        focusedRef.current = false;
      };
    }, [enabled, enableSearch, disableSearch]),
  );

  useEffect(() => {
    if (!focusedRef.current || !enabled) {
      return;
    }
    enableSearch(placeholder);
  }, [placeholder, enabled, enableSearch]);

  return query;
}

/** Detail breadcrumb/actions while this screen is focused. */
export function useDetailHeader(header: DetailHeader | null) {
  const { setDetailHeader } = useSearchChromeContext();
  const headerRef = useRef(header);
  headerRef.current = header;
  const focusedRef = useRef(false);

  // Depend on content, not object identity — inline `{ ... }` headers
  // would otherwise setState every render and hit max update depth (#185).
  const headerSyncKey = header
    ? [
        header.title,
        header.breadcrumbParent ?? '',
        header.statusLabel ?? '',
        String(header.deliveryCount ?? 0),
        String(header.invoiceCount ?? 0),
        header.validatingDelivery ? '1' : '0',
        header.creatingInvoice ? '1' : '0',
        header.payingInvoice ? '1' : '0',
        header.confirming ? '1' : '0',
        header.cancelling ? '1' : '0',
        header.onValidateDelivery ? '1' : '0',
        header.onOpenDelivery ? '1' : '0',
        header.onOpenInvoices ? '1' : '0',
        header.onPrint ? '1' : '0',
        header.onConfirm ? '1' : '0',
        header.onCreateInvoice ? '1' : '0',
        header.onPayInvoice ? '1' : '0',
        header.onCancel ? '1' : '0',
        header.onCreateQuotation ? '1' : '0',
      ].join('|')
    : '';

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      setDetailHeader(headerRef.current);
      return () => {
        focusedRef.current = false;
        setDetailHeader(null);
      };
    }, [setDetailHeader]),
  );

  useEffect(() => {
    if (!focusedRef.current) {
      return;
    }
    setDetailHeader(headerRef.current);
  }, [headerSyncKey, setDetailHeader]);
}

/**
 * Registers module-specific action buttons in the navbar while the calling
 * screen is focused.
 *
 * Actions are applied via ref + effect so unstable array identities (common
 * when callbacks close over `router`) do not re-fire useFocusEffect cleanup,
 * which remounts header controls and steals search focus on web.
 */
export function useHeaderActions(actions: HeaderAction[]) {
  const { setActions } = useSearchChromeContext();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      setActions(actionsRef.current);
      return () => {
        focusedRef.current = false;
        setActions([]);
      };
    }, [setActions]),
  );

  useEffect(() => {
    if (!focusedRef.current) {
      return;
    }
    setActions(actions);
  }, [actions, setActions]);
}

/**
 * Registers a collapsible filter panel below the navbar search bar.
 * The panel only opens/closes when the user taps the chevron arrow.
 */
export function useModuleFilters(panel: ReactNode, enabled = true) {
  const { enableFilters, unregisterFilters, setFilterPanel, filtersEnabled } =
    useSearchChromeContext();
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (enabled) {
        enableFilters(panelRef.current);
        return () => {
          focusedRef.current = false;
          unregisterFilters();
        };
      }
      unregisterFilters();
      return () => {
        focusedRef.current = false;
      };
    }, [enabled, enableFilters, unregisterFilters]),
  );

  useEffect(() => {
    if (!focusedRef.current || !enabled || !filtersEnabled) {
      return;
    }
    setFilterPanel(panel);
  }, [panel, enabled, filtersEnabled, setFilterPanel]);
}
