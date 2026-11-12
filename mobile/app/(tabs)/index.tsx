import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

import ZoomableImage from '../../src/components/ui/ZoomableImage';
import ListingDetails from '../../src/features/listings/ListingDetails';
import PublishListingForm from '../../src/features/listings/PublishListingForm';
import { getAccessToken } from '../../src/lib/api/auth';
import {
  getListingImageUri,
  getListings,
  type Listing,
} from '../../src/lib/api/listings';
import {
  getCurrentListingPosition,
  type ListingCoordinates,
} from '../../src/lib/location';

const categories = [
  'Tout',
  'Vêtements',
  'Électronique',
  'Maison',
  'BTP',
  'Autre',
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function HomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(
    null,
  );
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [position, setPosition] = useState<ListingCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      setError(null);
      const data = await getListings(position);
      setListings(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les annonces.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [position]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useEffect(() => {
    let active = true;

    getCurrentListingPosition()
      .then((coordinates) => {
        if (active) {
          setPosition(coordinates);
        }
      })
      .catch(() => {
        if (active) {
          setPosition(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredListings = useMemo(() => {
    const query = normalizeText(searchText);

    return listings.filter((listing) => {
      const matchesCategory =
        selectedCategory === 'Tout' ||
        normalizeText(listing.category) ===
          normalizeText(selectedCategory);

      const searchableText = normalizeText(
        `${listing.title} ${listing.description} ${listing.category} ${listing.city}`,
      );

      const matchesSearch =
        query.length === 0 || searchableText.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [listings, searchText, selectedCategory]);

  async function openPublishForm() {
    try {
      const token = await getAccessToken();

      if (!token) {
        Alert.alert(
          'Connexion nécessaire',
          'Connecte-toi pour publier une annonce.',
        );
        return;
      }

      setShowPublishForm(true);
    } catch {
      Alert.alert(
        'Session indisponible',
        'Reconnecte-toi avant de publier.',
      );
    }
  }

  if (selectedListingId !== null) {
    return (
      <ListingDetails
        listingId={selectedListingId}
        onBack={() => setSelectedListingId(null)}
      />
    );
  }

  if (showPublishForm) {
    return (
      <PublishListingForm
        onCancel={() => setShowPublishForm(false)}
        onPublished={() => {
          setShowPublishForm(false);
          setLoading(true);
          void loadListings();
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>BIZNESS</Text>
        <Text style={styles.subtitle}>
          Les bonnes affaires près de chez vous
        </Text>

        <View style={styles.searchBar}>
          <Search color="#6B746F" size={20} />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Rechercher des articles"
            placeholderTextColor="#8A918D"
            returnKeyType="search"
            style={styles.searchInput}
          />

          {searchText.length > 0 && (
            <Pressable
              onPress={() => setSearchText('')}
              accessibilityLabel="Effacer la recherche"
              hitSlop={8}
            >
              <X color="#6B746F" size={19} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((category) => {
            const selected = selectedCategory === category;

            return (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryChip,
                  selected && styles.categoryChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selected && styles.categoryTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {position && (
          <Text style={styles.locationHint}>
            📍 Annonces proches affichées en premier
          </Text>
        )}

        <Pressable
          style={styles.publishButton}
          onPress={() => void openPublishForm()}
        >
          <Text style={styles.publishButtonText}>
            ＋ Publier une annonce
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Annonces récentes</Text>
        <Text style={styles.count}>
          {filteredListings.length} produit(s)
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#176B5B" />
          <Text style={styles.message}>Chargement des annonces…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              void loadListings();
            }}
          >
            <Text style={styles.retry}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={styles.row}
          contentContainerStyle={
            filteredListings.length === 0
              ? styles.emptyList
              : styles.list
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadListings();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {searchText || selectedCategory !== 'Tout'
                  ? 'Aucun article trouvé'
                  : 'Aucune annonce pour le moment'}
              </Text>
              <Text style={styles.message}>
                {searchText || selectedCategory !== 'Tout'
                  ? 'Essaie une autre recherche ou une autre catégorie.'
                  : 'Les nouvelles annonces apparaîtront ici.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const imageUri = getListingImageUri(item.image_url);

            return (
              <View style={styles.card}>
                {imageUri ? (
                  <ZoomableImage uri={imageUri} height={190} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.message}>Pas de photo</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.price} numberOfLines={1}>
                    {new Intl.NumberFormat('fr-FR').format(item.price_xof)} F CFA
                  </Text>

                  <Pressable
                    style={styles.consultButton}
                    onPress={() => setSelectedListingId(item.id)}
                  >
                    <Text style={styles.consultText}>Consulter</Text>
                  </Pressable>
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
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    paddingTop: 42,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brand: {
    color: '#176B5B',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B746F',
    fontSize: 14,
    marginTop: 4,
  },
  searchBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#EDF2EF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    color: '#202522',
    fontSize: 15,
    paddingVertical: 10,
  },
  categoryList: {
    gap: 8,
    paddingVertical: 12,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#D7DEDA',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#176B5B',
    borderColor: '#176B5B',
  },
  categoryText: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  locationHint: {
    color: '#6B746F',
    fontSize: 12,
    marginBottom: 9,
  },
  publishButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#176B5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#202522',
    fontSize: 17,
    fontWeight: '700',
  },
  count: {
    color: '#6B746F',
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8ECE9',
  },
  imagePlaceholder: {
    height: 190,
    backgroundColor: '#E5F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 10,
  },
  title: {
    minHeight: 36,
    color: '#202522',
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    color: '#176B5B',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  consultButton: {
    minHeight: 36,
    backgroundColor: '#176B5B',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  consultText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#202522',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#6B746F',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    color: '#A83224',
    textAlign: 'center',
    marginBottom: 12,
  },
  retry: {
    color: '#176B5B',
    fontWeight: '700',
    padding: 10,
  },
});