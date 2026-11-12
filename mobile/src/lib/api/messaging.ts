import { getAccessToken } from './auth';
import { API_URL } from './config';

export type Conversation = {
  id: number;
  listing_id: number;
  listing_title: string | null;
  listing_image_url: string | null;
  other_user_id: number;
  other_user_name: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  created_at: string;
};

async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Connecte-toi pour accéder à la messagerie.');
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const data = JSON.parse(text) as { detail?: string };
    return data.detail || text || `Erreur serveur : ${response.status}`;
  } catch {
    return text || `Erreur serveur : ${response.status}`;
  }
}

export async function getMyConversations(): Promise<Conversation[]> {
  const response = await authenticatedFetch('/messaging/conversations');

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as Conversation[];
}

export async function openConversation(
  listingId: number,
): Promise<Conversation> {
  const response = await authenticatedFetch('/messaging/conversations', {
    method: 'POST',
    body: JSON.stringify({ listing_id: listingId }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as Conversation;
}

export async function getConversationMessages(
  conversationId: number,
): Promise<ChatMessage[]> {
  const response = await authenticatedFetch(
    `/messaging/conversations/${conversationId}/messages`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as ChatMessage[];
}

export async function sendConversationMessage(
  conversationId: number,
  body: string,
): Promise<ChatMessage> {
  const response = await authenticatedFetch(
    `/messaging/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as ChatMessage;
}