import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  getListingImageUri,
  getListings,
  type Listing,
} from '../../src/lib/api/listings';

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

export default function SearchScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedListingId, setSelectedListingId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadListings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      const result = await getListings();
      setListings(result);
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
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const filteredListings = useMemo(() => {
    const query = normalizeText(searchText);

    return listings.filter((listing) => {
      const matchesCategory =
        selectedCategory === 'Tout' ||
        normalizeText(listing.category) === normalizeText(selectedCategory);

      const searchableText = normalizeText(
        `${listing.title} ${listing.description} ${listing.category} ${listing.city}`,
      );

      const matchesSearch =
        query.length === 0 || searchableText.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [listings, searchText, selectedCategory]);

  if (selectedListingId !== null) {
    return (
      <ListingDetails
        listingId={selectedListingId}
        onBack={() => setSelectedListingId(null)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Rechercher</Text>
        <Text style={styles.subtitle}>
          Trouve les bonnes affaires près de chez toi.
        </Text>

        <View style={styles.searchBar}>
          <Search color="#6B746F" size={20} />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Rechercher un article, une ville…"
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

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Résultats</Text>
          <Text style={styles.resultsCount}>
            {filteredListings.length} article(s)
          </Text>
        </View>
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
            onPress={() => void loadListings()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={styles.row}
          contentContainerStyle={
            filteredListings.length === 0 ? styles.emptyList : styles.list
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadListings(true)}
              tintColor="#176B5B"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Aucun article trouvé</Text>
              <Text style={styles.message}>
                Essaie un autre mot ou une autre catégorie.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const imageUri = getListingImageUri(item.image_url);

            return (
              <View style={styles.card}>
                {imageUri ? (
                  <ZoomableImage uri={imageUri} height={180} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.message}>Pas de photo</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.price} numberOfLines={1}>
                    {new Intl.NumberFormat('fr-FR').format(item.price_xof)} F CFA
                  </Text>

                  <Text style={styles.city} numberOfLines={1}>
                    {item.city} · {item.category}
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
    paddingBottom: 10,
  },
  title: {
    color: '#202522',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B746F',
    fontSize: 14,
    marginTop: 5,
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
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 3,
  },
  resultsTitle: {
    color: '#202522',
    fontSize: 17,
    fontWeight: '700',
  },
  resultsCount: {
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
    height: 180,
    backgroundColor: '#E5F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 10,
  },
  productTitle: {
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
  city: {
    color: '#6B746F',
    fontSize: 12,
    marginTop: 4,
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
  },
  retryButton: {
    backgroundColor: '#176B5B',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});