export interface SavedAccount {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  password: string; // stored locally for instant re-login after logout
}

const KEY = "saved_accounts";

export function getSavedAccounts(): SavedAccount[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAccount(account: SavedAccount) {
  const existing = getSavedAccounts().filter((a) => a.id !== account.id);
  localStorage.setItem(KEY, JSON.stringify([account, ...existing]));
}

export function removeSavedAccount(id: string) {
  const updated = getSavedAccounts().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
}
