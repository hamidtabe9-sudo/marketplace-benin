import * as SecureStore from 'expo-secure-store';

import { API_URL } from './config';

const TOKEN_KEY = 'marketplace_access_token';

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  email_verified: boolean;
  created_at: string;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

type MessageResponse = { message: string };

async function readResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    let message = `Erreur serveur : ${response.status}`;
    if (data !== null && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail;
      message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
    throw new Error(message);
  }
  return data as T;
}

async function post<T>(path: string, payload: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readResponse<T>(response);
}

async function saveAuthResponse(data: AuthResponse): Promise<AuthUser> {
  await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
  return data.user;
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function registerAccount(input: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<string> {
  const data = await post<MessageResponse>('/auth/register', input);
  return data.message;
}

export async function verifyEmail(input: { email: string; code: string }): Promise<AuthUser> {
  const data = await post<AuthResponse>('/auth/verification/confirm', input);
  return saveAuthResponse(data);
}

export async function requestEmailVerification(email: string): Promise<string> {
  const data = await post<MessageResponse>('/auth/verification/request', { email });
  return data.message;
}

export async function loginAccount(input: {
  identifier: string;
  password: string;
}): Promise<AuthUser> {
  const data = await post<AuthResponse>('/auth/login', input);
  return saveAuthResponse(data);
}

export async function requestPasswordReset(email: string): Promise<string> {
  const data = await post<MessageResponse>('/auth/password-reset/request', { email });
  return data.message;
}

export async function resetPassword(input: {
  email: string;
  code: string;
  new_password: string;
}): Promise<string> {
  const data = await post<MessageResponse>('/auth/password-reset/confirm', input);
  return data.message;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return null;
  }
  return readResponse<AuthUser>(response);
}

export async function logoutAccount(): Promise<void> {
  const token = await getAccessToken();
  try {
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // La fermeture locale reste effective même si le serveur est inaccessible.
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
