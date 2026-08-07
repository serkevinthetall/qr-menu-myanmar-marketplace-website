/** @temp-feature app-install-call-list */
import { View } from 'react-native';
import { Chip } from 'react-native-paper';

import { APP_INSTALL_STATUS_OPTIONS, AppInstallStatus } from './types';

export type AppInstallFilter = AppInstallStatus | 'all' | 'none';

export function ContactAppInstallFilters({
  value,
  onChange,
}: {
  value: AppInstallFilter;
  onChange: (next: AppInstallFilter) => void;
}) {
  const options: { id: AppInstallFilter; label: string }[] = [
    { id: 'all', label: 'All installs' },
    { id: 'none', label: 'Not requested' },
    ...APP_INSTALL_STATUS_OPTIONS.filter(
      (o): o is { id: AppInstallStatus; label: string } => o.id !== 'all',
    ),
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        paddingHorizontal: 12,
      }}>
      {options.map(opt => (
        <Chip
          key={opt.id}
          compact
          selected={value === opt.id}
          onPress={() => onChange(opt.id)}>
          {opt.label}
        </Chip>
      ))}
    </View>
  );
}
