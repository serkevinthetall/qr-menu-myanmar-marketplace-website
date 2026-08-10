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
  useTransition,
} from 'react';

import { PrintFormat } from '@/utils/print-quotation';

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
  /** Cancel draft quotation — shown on the right of the detail navbar. */
  onCancel?: () => void;
  cancelling?: boolean;
};

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  /** Immediate header input value; may lead the deferred `query` used for filtering. */
  inputQuery: string;
  setInputQuery: (value: string) => void;
  placeholder: string;
  visible: boolean;
  enableSearch: (placeholder: string) => void;
  disableSearch: () => void;
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

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * Holds navbar state shared between the header and the focused screen: the
 * search query and any module-specific action buttons. A screen turns these
 * on while it is focused (via `useModuleSearch` / `useHeaderActions`).
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
  const [, startFilterTransition] = useTransition();

  const setInputQuery = useCallback((value: string) => {
    setInputQueryState(value);
    startFilterTransition(() => {
      setQueryState(value);
    });
  }, [startFilterTransition]);

  const setQuery = useCallback((value: string) => {
    setInputQueryState(value);
    setQueryState(value);
  }, []);

  const enableSearch = useCallback((nextPlaceholder: string) => {
    setPlaceholder(nextPlaceholder);
    setVisible(true);
  }, []);

  const disableSearch = useCallback(() => {
    setVisible(false);
    setInputQueryState('');
    setQueryState('');
    setFiltersEnabled(false);
    setFiltersExpanded(false);
    setFilterPanel(null);
  }, []);

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

  const value = useMemo<SearchContextValue>(
    () => ({
      query,
      setQuery,
      inputQuery,
      setInputQuery,
      placeholder,
      visible,
      enableSearch,
      disableSearch,
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
      query,
      setQuery,
      inputQuery,
      setInputQuery,
      placeholder,
      visible,
      enableSearch,
      disableSearch,
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

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}

/** Safe for Portal/modals that may render outside SearchProvider. */
export function useOptionalSearch() {
  return useContext(SearchContext);
}

/**
 * Enables the navbar search bar while the calling screen is focused and
 * returns the deferred query for local filtering.
 */
export function useModuleSearch(placeholder: string, enabled = true) {
  const { query, enableSearch, disableSearch } = useSearch();
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        enableSearch(placeholderRef.current);
        return () => disableSearch();
      }
      disableSearch();
      return undefined;
    }, [enabled, enableSearch, disableSearch]),
  );

  useEffect(() => {
    if (enabled) {
      enableSearch(placeholder);
    }
  }, [placeholder, enabled, enableSearch]);

  return query;
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
  const { setActions } = useSearch();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useFocusEffect(
    useCallback(() => {
      setActions(actionsRef.current);
      return () => setActions([]);
    }, [setActions]),
  );

  useEffect(() => {
    setActions(actions);
  }, [actions, setActions]);
}

/**
 * Registers a collapsible filter panel below the navbar search bar.
 * The panel only opens/closes when the user taps the chevron arrow.
 */
export function useModuleFilters(panel: ReactNode, enabled = true) {
  const { enableFilters, unregisterFilters, setFilterPanel, filtersEnabled } =
    useSearch();
  const panelRef = useRef(panel);
  panelRef.current = panel;

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        enableFilters(panelRef.current);
        return () => unregisterFilters();
      }
      unregisterFilters();
      return undefined;
    }, [enabled, enableFilters, unregisterFilters]),
  );

  useEffect(() => {
    if (enabled && filtersEnabled) {
      setFilterPanel(panel);
    }
  }, [panel, enabled, filtersEnabled, setFilterPanel]);
}
