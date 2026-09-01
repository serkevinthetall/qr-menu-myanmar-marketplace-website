import { Township } from '@/types/customer';

export type ContactForm = {
  name: string;
  email: string;
  phone: string;
  street: string;
  street2: string;
  township: string;
  townshipId: string;
  tagIds: string[];
};

export const EMPTY_CONTACT_FORM: ContactForm = {
  name: '',
  email: '',
  phone: '',
  street: '',
  street2: '',
  township: '',
  townshipId: '',
  tagIds: [],
};

export function cleanLabel(value: string): string {
  return String(value || '')
    .replace('*', '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function findMatchingTownship(
  inputText: string,
  townships: Township[],
): Township | null {
  const value = cleanLabel(inputText);
  if (!value) {
    return null;
  }

  let exact: Township | null = null;
  let contains: Township | null = null;

  for (const township of townships) {
    const cleanTownshipName = cleanLabel(township.name);
    if (cleanTownshipName === value) {
      exact = township;
      break;
    }
    if (!contains && cleanTownshipName.includes(value)) {
      contains = township;
    }
  }

  return exact || contains;
}

export function toggleTag(currentTagIds: string[], tagId: string): string[] {
  return currentTagIds.includes(tagId)
    ? currentTagIds.filter(id => id !== tagId)
    : [...currentTagIds, tagId];
}
