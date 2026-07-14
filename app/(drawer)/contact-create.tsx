import { CreateContactView } from '@/components/contact/CreateContactView';
import { useModuleSearch } from '@/contexts/search-context';

export default function ContactCreateScreen() {
  useModuleSearch('', false);
  return <CreateContactView />;
}
