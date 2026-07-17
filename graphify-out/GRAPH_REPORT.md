# Graph Report - frontend  (2026-07-17)

## Corpus Check
- 86 files · ~55,072 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 605 nodes · 1176 edges · 61 communities (33 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8809839`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- customers.tsx
- index.tsx
- print-quotation.ts
- collapsible.tsx
- QuotationBuilder.tsx
- expo
- QuotationDetailView.tsx
- scripts
- ContactFilterBar.tsx
- auth-context.tsx
- customers.ts
- quotation-filter-utils.ts
- theme-context.tsx
- CreateContactView.tsx
- quotation-draft-storage.ts
- speech-recognition.d.ts
- CalendarField.tsx
- include
- QuotationFilterBar.tsx
- useAppColors
- useAppTheme
- dependencies
- reset-project.js
- login.tsx
- use-myanmar-speech-to-text.ts
- Welcome to your Expo app 👋
- ScreenTemplate.tsx
- ResizableDivider.tsx
- vercel.json
- Expo HAS CHANGED
- eslint.config.js
- expo-constants
- expo-font
- expo-haptics
- expo-image
- expo-linking
- expo-router
- expo-splash-screen
- expo-status-bar
- expo-symbols
- expo-system-ui
- @expo/vector-icons
- @fontsource/noto-sans-myanmar
- react-dom
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-paper
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-web
- react-native-worklets
- @react-navigation/bottom-tabs
- @react-navigation/drawer
- @react-navigation/elements
- @react-navigation/native

## God Nodes (most connected - your core abstractions)
1. `QuotationScreen()` - 26 edges
2. `useResponsive()` - 23 edges
3. `QuotationBuilder()` - 21 edges
4. `useAppTheme()` - 21 edges
5. `useAppColors()` - 19 edges
6. `useAuth()` - 17 edges
7. `expo` - 14 edges
8. `useDetailTheme()` - 14 edges
9. `CreateContactView()` - 13 edges
10. `CustomersScreen()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `SettingsScreen()` --calls--> `useAppTheme()`  [EXTRACTED]
  app/(drawer)/settings.tsx → contexts/theme-context.tsx
- `AuthGate()` --calls--> `useAuth()`  [EXTRACTED]
  app/_layout.tsx → contexts/auth-context.tsx
- `PreviewFrame()` --calls--> `useAppColors()`  [EXTRACTED]
  components/quotation/QuotationPrintPreview.tsx → hooks/use-app-colors.ts
- `DrawerLayout()` --calls--> `useAppTheme()`  [EXTRACTED]
  app/(drawer)/_layout.tsx → contexts/theme-context.tsx
- `ContactCreateScreen()` --calls--> `useModuleSearch()`  [EXTRACTED]
  app/(drawer)/contact-create.tsx → contexts/search-context.tsx

## Import Cycles
- None detected.

## Communities (61 total, 28 thin omitted)

### Community 0 - "customers.tsx"
Cohesion: 0.06
Nodes (55): ContactCreateScreen(), cellText(), Column, COLUMNS, ContactRow(), CustomerCard(), CustomersScreen(), formatDate() (+47 more)

### Community 1 - "index.tsx"
Cohesion: 0.08
Nodes (39): cellText(), Column, COLUMNS, formatDateTime(), formatMoney(), MONTHS, QuotationCard(), QuotationRow() (+31 more)

### Community 2 - "print-quotation.ts"
Cohesion: 0.08
Nodes (41): PreviewFrame(), QuotationPrintPreview(), QuotationPrintPreviewProps, styles, xlsx, Cell, escapeCell(), exportToCsv() (+33 more)

### Community 3 - "collapsible.tsx"
Cohesion: 0.12
Nodes (18): styles, ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView() (+10 more)

### Community 4 - "QuotationBuilder.tsx"
Cohesion: 0.12
Nodes (24): addressDisplay(), clampPrimarySize(), customerAddress(), customerFromAddressCompany(), formatMoney(), lineAmount(), OrderLineRow(), OrderLineRowProps (+16 more)

### Community 5 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, predictiveBackGestureEnabled, reactCompiler (+17 more)

### Community 6 - "QuotationDetailView.tsx"
Cohesion: 0.14
Nodes (22): ContactDetailView(), ContactDetailViewProps, initials(), MetaField(), styles, SurfaceCard(), DeliveryNotesCard(), DetailTab (+14 more)

### Community 7 - "scripts"
Cohesion: 0.09
Nodes (21): eslint, eslint-config-expo, devDependencies, eslint, eslint-config-expo, @types/react, typescript, main (+13 more)

### Community 8 - "ContactFilterBar.tsx"
Cohesion: 0.18
Nodes (19): CONTACT_PERIOD_OPTIONS, CONTACT_STATUS_FILTERS, ContactFilters, ContactPeriod, ContactStatusFilter, EMPTY_CONTACT_FILTERS, endOfMonth(), endOfQuarter() (+11 more)

### Community 9 - "auth-context.tsx"
Cohesion: 0.18
Nodes (15): API_BASE_URL, isLocalDevApiUrl(), resolveApiBaseUrl(), AuthContext, AuthContextValue, AuthProvider(), ApiOptions, apiRequest() (+7 more)

### Community 10 - "customers.ts"
Cohesion: 0.14
Nodes (18): CreateAddressResponse, CreateCustomerResponse, CustomerAddressesResponse, CustomerDetailResponse, CustomersPage, CustomersResponse, fetchCustomers(), fetchCustomersPage() (+10 more)

### Community 11 - "quotation-filter-utils.ts"
Cohesion: 0.18
Nodes (18): EMPTY_QUOTATION_FILTERS, endOfMonth(), endOfWeek(), endOfYear(), getPresetDateRange(), getQuotationDateRange(), hasActiveQuotationFilters(), matchesQuotationFilters() (+10 more)

### Community 12 - "theme-context.tsx"
Cohesion: 0.15
Nodes (13): SettingsScreen(), styles, AppColorScheme, AppColorToken, Palette, sharedHeaderField, ThemeMode, fontConfig (+5 more)

### Community 13 - "CreateContactView.tsx"
Cohesion: 0.19
Nodes (16): cleanLabel(), CreateContactForm, CreateContactView(), CreateContactViewProps, EMPTY_FORM, findMatchingTownship(), styles, toggleTag() (+8 more)

### Community 14 - "quotation-draft-storage.ts"
Cohesion: 0.32
Nodes (12): OrderLine, DraftFormState, useQuotationDraftPersistence(), UseQuotationDraftPersistenceOptions, Customer, clearQuotationDraft(), hasStoredDraftContent(), loadQuotationDraft() (+4 more)

### Community 15 - "speech-recognition.d.ts"
Cohesion: 0.14
Nodes (8): SpeechRecognition, SpeechRecognitionAlternative, SpeechRecognitionConstructor, SpeechRecognitionErrorEvent, SpeechRecognitionEvent, SpeechRecognitionResult, SpeechRecognitionResultList, Window

### Community 16 - "CalendarField.tsx"
Cohesion: 0.27
Nodes (10): CalendarField(), CalendarFieldProps, formatDisplay(), isSameDay(), MONTHS, pad(), parseISO(), styles (+2 more)

### Community 17 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 18 - "QuotationFilterBar.tsx"
Cohesion: 0.27
Nodes (8): QUOTATION_PERIOD_OPTIONS, QuotationFilterBar(), QuotationFilterBarProps, styles, getFilterStatusColors(), quotationStatusDark, quotationStatusLight, StatusPair

### Community 19 - "useAppColors"
Cohesion: 0.29
Nodes (7): DropdownField(), DropdownFieldProps, styles, SearchableDropdownField(), SearchableDropdownFieldProps, styles, useAppColors()

### Community 20 - "useAppTheme"
Cohesion: 0.28
Nodes (7): StatusBadge(), AuthGate(), RootLayoutNav(), ThemeLoading(), unstable_settings, getContactStatusColors(), useAppTheme()

### Community 21 - "dependencies"
Cohesion: 0.22
Nodes (9): expo, expo-web-browser, dependencies, expo, expo-web-browser, react, react-native, react (+1 more)

### Community 22 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 23 - "login.tsx"
Cohesion: 0.46
Nodes (6): LoginScreen(), styles, clearSavedCredentials(), loadSavedCredentials(), saveCredentials(), SavedCredentials

### Community 24 - "use-myanmar-speech-to-text.ts"
Cohesion: 0.39
Nodes (7): getSpeechRecognitionCtor(), mapSpeechError(), MYANMAR_LOCALES, normalizeTranscript(), pickBestTranscript(), useMyanmarSpeechToText(), UseMyanmarSpeechToTextOptions

### Community 25 - "Welcome to your Expo app 👋"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

### Community 27 - "ResizableDivider.tsx"
Cohesion: 0.50
Nodes (3): ResizableDivider(), ResizableDividerProps, styles

### Community 28 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

## Knowledge Gaps
- **215 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `print-quotation.ts`, `scripts`, `expo-constants`, `expo-font`, `expo-haptics`, `expo-image`, `expo-linking`, `expo-router`, `expo-splash-screen`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `@expo/vector-icons`, `@fontsource/noto-sans-myanmar`, `react-dom`, `@react-native-async-storage/async-storage`, `react-native-gesture-handler`, `react-native-paper`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-web`, `react-native-worklets`, `@react-navigation/bottom-tabs`, `@react-navigation/drawer`, `@react-navigation/elements`, `@react-navigation/native`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `xlsx` connect `print-quotation.ts` to `dependencies`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _215 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `customers.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0841813135985199 - nodes in this community are weakly interconnected._
- **Should `print-quotation.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08233117483811286 - nodes in this community are weakly interconnected._
- **Should `collapsible.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._