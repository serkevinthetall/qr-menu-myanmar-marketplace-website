import { CreateContactView } from '@/components/contact/CreateContactView';
import { useLocalSearchParams } from 'expo-router';
import { useModuleSearch } from '@/contexts/search-context';

export default function ContactCreateScreen() {
  useModuleSearch('', false);
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'vendor' ? 'vendor' : 'contact';
  return <CreateContactView mode={mode} />;
}
