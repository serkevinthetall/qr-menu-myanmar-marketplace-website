import { DrawerHeaderProps } from '@react-navigation/drawer';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Appbar, Button, Icon, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSearch } from '@/contexts/search-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useResponsive } from '@/hooks/use-responsive';

export function AppHeader({ navigation, options }: DrawerHeaderProps) {
  const theme = useTheme();
  const colors = useAppColors();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const {
    visible,
    placeholder,
    query,
    setQuery,
    actions,
    filtersEnabled,
    filtersExpanded,
    setFiltersExpanded,
    filterPanel,
    detailHeader,
  } = useSearch();

  const toggleFilters = () => setFiltersExpanded(!filtersExpanded);
  const [printMenuVisible, setPrintMenuVisible] = useState(false);

  const openPrintMenu = () => {
    if (detailHeader?.onPrint) {
      setPrintMenuVisible(true);
    }
  };

  const handlePrint = (format: 'a4' | 'thermal') => {
    setPrintMenuVisible(false);
    detailHeader?.onPrint?.(format);
  };

  return (
    <Appbar.Header
      elevated
      style={{
        backgroundColor: theme.colors.primary,
        paddingTop: insets.top,
        height: 'auto',
        minHeight: 56 + insets.top,
      }}>
      <View style={styles.headerColumn}>
        <View style={styles.headerRow}>
          {detailHeader ? (
            <IconButton
              icon="arrow-left"
              iconColor={colors.onPrimary}
              containerColor="transparent"
              rippleColor={colors.headerRipple}
              size={24}
              onPress={detailHeader.onBack}
              accessibilityLabel="Go back"
            />
          ) : (
            <IconButton
              icon="menu"
              iconColor={colors.onPrimary}
              containerColor="transparent"
              rippleColor={colors.headerRipple}
              size={24}
              onPress={() => navigation.toggleDrawer()}
            />
          )}

          {visible ? (
            <View style={[styles.searchBox, { backgroundColor: colors.searchBg }]}>
              <Icon source="magnify" size={20} color={colors.searchIcon} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={colors.searchPlaceholder}
                style={[styles.searchInput, { color: colors.searchText }]}
                returnKeyType="search"
                underlineColorAndroid="transparent"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  style={styles.clearButton}>
                  <Icon source="close" size={18} color={colors.searchIcon} />
                </Pressable>
              ) : null}
              {filtersEnabled ? (
                <Pressable
                  onPress={toggleFilters}
                  hitSlop={8}
                  style={styles.filterToggle}
                  accessibilityLabel={
                    filtersExpanded ? 'Hide contact filters' : 'Show contact filters'
                  }>
                  <Icon
                    source={filtersExpanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.searchIcon}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : detailHeader ? (
            <View style={styles.detailHeaderContent}>
              <Text style={[styles.detailBreadcrumb, { color: 'rgba(255,255,255,0.85)' }]}>
                {detailHeader.breadcrumbParent ?? 'Orders'}
                <Text style={{ color: 'rgba(255,255,255,0.55)' }}> {'>'} </Text>
                {detailHeader.title}
              </Text>
              <View style={styles.detailTitleRow}>
                <Text style={[styles.detailTitle, { color: colors.onPrimary }]}>
                  {detailHeader.title}
                </Text>
                {detailHeader.statusLabel ? (
                  <View style={[styles.detailBadge, { backgroundColor: colors.headerFieldBg }]}>
                    <Text style={[styles.detailBadgeText, { color: theme.colors.primary }]}>
                      {detailHeader.statusLabel.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <Appbar.Content
              title={options.title ?? 'QR Shop ERP'}
              titleStyle={{ color: colors.onPrimary, fontWeight: '600' }}
            />
          )}

          {detailHeader && !visible ? (
            <>
              {detailHeader.onCreateQuotation ? (
                isMobile ? (
                  <IconButton
                    icon="file-document-plus-outline"
                    iconColor={colors.onPrimary}
                    containerColor="transparent"
                    rippleColor={colors.headerRipple}
                    size={22}
                    onPress={detailHeader.onCreateQuotation}
                    accessibilityLabel="Create quotation for this contact"
                  />
                ) : (
                  <Pressable
                    onPress={detailHeader.onCreateQuotation}
                    style={[
                      styles.detailActionGhost,
                      { marginRight: 6 },
                    ]}>
                    <Icon source="file-document-plus-outline" size={16} color={colors.onPrimary} />
                    <Text style={[styles.detailActionGhostText, { color: colors.onPrimary }]}>
                      CREATE QUOTATION
                    </Text>
                  </Pressable>
                )
              ) : null}
              {detailHeader.onPrint ? (
                <Menu
                  visible={printMenuVisible}
                  onDismiss={() => setPrintMenuVisible(false)}
                  anchor={
                    isMobile ? (
                      <IconButton
                        icon="printer"
                        iconColor={colors.onPrimary}
                        containerColor="transparent"
                        rippleColor={colors.headerRipple}
                        size={22}
                        onPress={openPrintMenu}
                        accessibilityLabel="Print quotation"
                      />
                    ) : (
                      <Pressable
                        onPress={openPrintMenu}
                        style={styles.detailActionGhost}>
                        <Icon source="printer" size={16} color={colors.onPrimary} />
                        <Text style={[styles.detailActionGhostText, { color: colors.onPrimary }]}>
                          PRINT
                        </Text>
                        <Icon source="chevron-down" size={14} color={colors.onPrimary} />
                      </Pressable>
                    )
                  }>
                  <Menu.Item
                    onPress={() => handlePrint('a4')}
                    title="A4"
                    leadingIcon="file-document-outline"
                  />
                  <Menu.Item
                    onPress={() => handlePrint('thermal')}
                    title="Thermal (80mm)"
                    leadingIcon="receipt"
                  />
                </Menu>
              ) : null}
            </>
          ) : (
            actions.map(action =>
              action.label ? (
                <Button
                  key={action.key}
                  icon={action.icon}
                  mode="outlined"
                  compact
                  textColor={colors.onPrimary}
                  rippleColor={colors.headerRipple}
                  style={[styles.textAction, { borderColor: colors.onPrimary }]}
                  contentStyle={styles.textActionContent}
                  labelStyle={styles.textActionLabel}
                  accessibilityLabel={action.accessibilityLabel}
                  onPress={action.onPress}>
                  {action.label}
                </Button>
              ) : (
                <IconButton
                  key={action.key}
                  icon={action.icon ?? 'dots-horizontal'}
                  iconColor={colors.onPrimary}
                  containerColor="transparent"
                  rippleColor={colors.headerRipple}
                  size={24}
                  accessibilityLabel={action.accessibilityLabel}
                  onPress={action.onPress}
                />
              ),
            )
          )}
        </View>

        {filtersEnabled && filtersExpanded && filterPanel ? (
          <View
            style={[
              styles.filterPanel,
              { borderTopColor: 'rgba(255,255,255,0.2)' },
            ]}>
            {filterPanel}
          </View>
        ) : null}
      </View>
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  headerColumn: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingRight: 4,
  },
  detailHeaderContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailBreadcrumb: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  detailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  detailActionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    marginRight: 6,
  },
  detailActionDisabled: {
    opacity: 0.45,
  },
  detailActionFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 2,
  },
  detailActionGhostText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginRight: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  clearButton: {
    padding: 2,
    borderRadius: 12,
  },
  filterToggle: {
    padding: 2,
    borderRadius: 12,
  },
  filterPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    alignItems: 'center',
  },
  textAction: {
    marginRight: 6,
    marginLeft: 2,
    borderRadius: 16,
  },
  textActionContent: {
    height: 36,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 0,
    marginHorizontal: 14,
  },
});
