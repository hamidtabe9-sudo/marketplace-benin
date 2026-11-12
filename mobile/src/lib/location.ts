import * as Location from 'expo-location';

export type ListingCoordinates = {
  latitude: number;
  longitude: number;
};

export async function getCurrentListingPosition(): Promise<ListingCoordinates | null> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({});

  return {
    latitude: Number(position.coords.latitude.toFixed(3)),
    longitude: Number(position.coords.longitude.toFixed(3)),
  };
}