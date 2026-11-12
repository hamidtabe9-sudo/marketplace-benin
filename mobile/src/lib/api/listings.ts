import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { getAccessToken } from './auth';
import { API_URL } from './config';

export type ListingCoordinates = {
  latitude: number;
  longitude: number;
};

export type Listing = {
  id: number;
  title: string;
  description: string;
  price_xof: number;
  category: string;
  city: string;
  image_url: string | null;
  owner_id: number | null;
  created_at: string;
};

export type ListingDetail = Listing & {
  seller_name: string;
  seller_phone: string;
  seller_email: string;
};

export type ListingCreate = {
  title: string;
  description: string;
  price_xof: number;
  category: string;
  city: string;
  image_url?: string | null;
  latitude?: number;
  longitude?: number;
};

async function readError(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as { detail?: string };
    return parsed.detail || text;
  } catch {
    return text || `Erreur API : ${response.status}`;
  }
}

export function getListingImageUri(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  return `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

export async function getListings(
  position?: ListingCoordinates | null,
): Promise<Listing[]> {
  const query = position
    ? `?latitude=${position.latitude}&longitude=${position.longitude}`
    : '';

  const response = await fetch(`${API_URL}/listings${query}`);

  if (!response.ok) throw new Error(await readError(response));

  return (await response.json()) as Listing[];
}

export async function getMyListings(): Promise<Listing[]> {
  const token = await getAccessToken();

  if (!token) throw new Error('Connecte-toi pour voir tes publications.');

  const response = await fetch(`${API_URL}/listings/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(await readError(response));

  return (await response.json()) as Listing[];
}

export async function getListingDetail(
  listingId: number,
): Promise<ListingDetail> {
  const response = await fetch(`${API_URL}/listings/${listingId}`);

  if (!response.ok) throw new Error(await readError(response));

  return (await response.json()) as ListingDetail;
}

export async function uploadListingImage(uri: string): Promise<string> {
  const token = await getAccessToken();

  if (!token) throw new Error('Connecte-toi avant de publier une annonce.');

  const imageFile = new File(uri);
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await expoFetch(`${API_URL}/listings/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) throw new Error(await readError(response));

  const result = (await response.json()) as { image_url: string };
  return result.image_url;
}

export async function createListing(
  listing: ListingCreate,
): Promise<Listing> {
  const token = await getAccessToken();

  if (!token) throw new Error('Connecte-toi pour publier une annonce.');

  const response = await fetch(`${API_URL}/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(listing),
  });

  if (!response.ok) throw new Error(await readError(response));

  return (await response.json()) as Listing;
}

export async function updateListing(
  listingId: number,
  listing: ListingCreate,
): Promise<Listing> {
  const token = await getAccessToken();

  if (!token) throw new Error('Connecte-toi pour modifier ton annonce.');

  const response = await fetch(`${API_URL}/listings/${listingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(listing),
  });

  if (!response.ok) throw new Error(await readError(response));

  return (await response.json()) as Listing;
}

export async function deleteListing(listingId: number): Promise<void> {
  const token = await getAccessToken();

  if (!token) throw new Error('Connecte-toi pour supprimer ton annonce.');

  const response = await fetch(`${API_URL}/listings/${listingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(await readError(response));
}