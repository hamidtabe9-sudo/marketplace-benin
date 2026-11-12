import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ZoomableImage from '../../src/components/ui/ZoomableImage';
import EditListingForm from '../../src/features/listings/EditListingForm';
import ListingDetails from '../../src/features/listings/ListingDetails';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  deleteListing,
  getListingImageUri,
  getMyListings,
  type Listing,
} from '../../src/lib/api/listings';

export default function MyListingsScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadListings = useCallback(async () => {
    try {
      setError(null);
      setListings(await getMyListings());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de charger tes annonces.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  function confirmDelete(listing: Listing) {
    Alert.alert(
      'Supprimer cette annonce ?',
      `« ${listing.title} » sera supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deleteAndReload(listing.id);
          },
        },
      ],
    );
  }

  async function deleteAndReload(id: number) {
    try {
      await deleteListing(id);
      await loadListings();
    } catch (err) {
      Alert.alert(
        'Suppression impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    }
  }

  if (selectedId !== null) {
    return (
      <ListingDetails
        listingId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  if (editingListing) {
    return (
      <EditListingForm
        listing={editingListing}
        onCancel={() => setEditingListing(null)}
        onSaved={() => {
          setEditingListing(null);
          setLoading(true);
          void loadListings();
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Mes publications</Text>
      <Text style={styles.subtitle}>
        Consulte, modifie ou supprime tes annonces.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#176B5B" />
          <Text style={styles.muted}>Chargement…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => { setLoading(true); void loadListings(); }}>
            <Text style={styles.link}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={listings.length === 0 ? styles.empty : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void loadListings(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Tu n’as pas encore publié d’annonce.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const imageUri = getListingImageUri(item.image_url);

            return (
              <View style={styles.card}>
                {imageUri ? (
                  <ZoomableImage uri={imageUri} height={165} />
                ) : (
                  <View style={styles.imageEmpty}>
                    <Text style={styles.muted}>Pas de photo</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={styles.price}>
                    {new Intl.NumberFormat('fr-FR').format(item.price_xof)} F CFA
                  </Text>
                  <Text style={styles.title}>{item.title}</Text>

                  <View style={styles.actions}>
                    <Pressable
                      style={styles.outlineButton}
                      onPress={() => setSelectedId(item.id)}
                    >
                      <Text style={styles.outlineText}>Consulter</Text>
                    </Pressable>
                    <Pressable
                      style={styles.outlineButton}
                      onPress={() => setEditingListing(item)}
                    >
                      <Text style={styles.outlineText}>Modifier</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => confirmDelete(item)}
                    >
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F6', paddingTop: 45 },
  heading: { color: '#202522', fontSize: 25, fontWeight: '800', paddingHorizontal: 20 },
  subtitle: { color: '#6B746F', fontSize: 14, margin: 20, marginTop: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { flexGrow: 1, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: '#6B746F', textAlign: 'center', marginTop: 8 },
  error: { color: '#A83224', textAlign: 'center', marginBottom: 12 },
  link: { color: '#176B5B', fontWeight: '700', padding: 10 },
  emptyTitle: { color: '#202522', textAlign: 'center', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    marginBottom: 14, borderWidth: 1, borderColor: '#E8ECE9',
  },
  imageEmpty: { height: 165, backgroundColor: '#E5F0EC', justifyContent: 'center' },
  cardContent: { padding: 14 },
  price: { color: '#176B5B', fontSize: 17, fontWeight: '800' },
  title: { color: '#202522', fontSize: 16, fontWeight: '700', marginTop: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  outlineButton: {
    minHeight: 40, borderWidth: 1, borderColor: '#176B5B',
    borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12,
  },
  outlineText: { color: '#176B5B', fontWeight: '700', fontSize: 12 },
  deleteButton: {
    minHeight: 40, borderWidth: 1, borderColor: '#E7B4AE',
    backgroundColor: '#FFF1EF', borderRadius: 10,
    justifyContent: 'center', paddingHorizontal: 12,
  },
  deleteText: { color: '#A83224', fontWeight: '700', fontSize: 12 },
});