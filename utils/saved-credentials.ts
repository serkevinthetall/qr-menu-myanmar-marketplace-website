import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_CREDENTIALS_KEY = '@qr_shop_saved_credentials';

export type SavedCredentials = {
  email: string;
  password: string;
};

export async function loadSavedCredentials(): Promise<SavedCredentials | null> {
  try {
    const stored = await AsyncStorage.getItem(SAVED_CREDENTIALS_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as SavedCredentials;
    if (!parsed.email || !parsed.password) {
      return null;
    }

    return {
      email: String(parsed.email).trim(),
      password: String(parsed.password),
    };
  } catch {
    return null;
  }
}

export async function saveCredentials(credentials: SavedCredentials): Promise<void> {
  await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function clearSavedCredentials(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
}
