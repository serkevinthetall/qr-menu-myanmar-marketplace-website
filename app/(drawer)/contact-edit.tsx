import { useLocalSearchParams } from 'expo-router';

import { EditContactView } from '@/components/contact/EditContactView';
import { useModuleSearch } from '@/contexts/search-context';

export default function ContactEditScreen() {
  useModuleSearch('', false);
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return null;
  }

  return <EditContactView contactId={String(id)} />;
}
