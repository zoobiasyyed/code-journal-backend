import { User } from './components/useUser';

const authKey = 'um.auth';

type Auth = {
  user: User;
  token: string;
};

export function saveAuth(user: User, token: string): void {
  const auth: Auth = { user, token };
  localStorage.setItem(authKey, JSON.stringify(auth));
}

export function removeAuth(): void {
  localStorage.removeItem(authKey);
}

export function readToken(): string | undefined {
  const auth = localStorage.getItem(authKey);
  if (!auth) return undefined;
  return (JSON.parse(auth) as Auth).token;
}

export type Entry = {
  entryId?: number;
  title: string;
  notes: string;
  photoUrl: string;
};

export async function readEntries(): Promise<Entry[]> {
  const response = await fetch('/api/entries', {
    headers: {
      Authorization: `Bearer ${readToken()}`,
    },
  });
  if (!response.ok) throw new Error(`fetch Error: ${response.status}`);
  return response.json();
}

export async function readEntry(entryId: number): Promise<Entry | undefined> {
  const response = await fetch(`/api/entries/${entryId}`, {
    headers: {
      Authorization: `Bearer ${readToken()}`,
    },
  });
  if (!response.ok) throw new Error(`fetch Error: ${response.status}`);
  return response.json();
}

export async function addEntry(entry: Entry): Promise<Entry> {
  const response = await fetch(`/api/entries/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${readToken()}`,
    },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error(`fetch Error: ${response.status}`);
  return response.json();
}

export async function updateEntry(entry: Entry): Promise<Entry> {
  const response = await fetch(`/api/entries/${entry.entryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${readToken()}`,
    },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error(`fetch Error: ${response.status}`);
  return response.json();
}

export async function removeEntry(entryId: number): Promise<void> {
  const response = await fetch(`/api/entries/${entryId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${readToken()}`,
    },
  });
  if (!response.ok) throw new Error(`fetch Error: ${response.status}`);
}
