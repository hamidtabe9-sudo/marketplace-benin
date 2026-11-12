import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import ZoomableImage from '../../components/ui/ZoomableImage';
import {
  getListingImageUri,
  updateListing,
  uploadListingImage,
  type Listing,
} from '../../lib/api/listings';

type Props = {
  listing: Listing;
  onCancel: () => void;
  onSaved: () => void;
};

const categories = [
  'Vêtements',
  'Électronique',
  'Maison',
  'BTP',
  'Autre',
];

const cities = ['Cotonou', 'Parakou'];

export default function EditListingForm({
  listing,
  onCancel,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(String(listing.price_xof));
  const [category, setCategory] = useState(listing.category);
  const [city, setCity] = useState(listing.city);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableCategories = categories.includes(category)
    ? categories
    : [category, ...categories];

  async function chooseImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Autorisation nécessaire',
        'Autorise l’accès à tes photos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setNewImage(result.assets[0].uri);
    }
  }

  async function save() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const numericPrice = Number(price);

    if (cleanTitle.length < 3 || cleanDescription.length < 5) {
      Alert.alert(
        'Informations invalides',
        'Vérifie le titre et la description.',
      );
      return;
    }

    if (!Number.isInteger(numericPrice) || numericPrice <= 0) {
      Alert.alert(
        'Prix invalide',
        'Saisis un prix entier positif en FCFA.',
      );
      return;
    }

    if (!category.trim() || !city.trim()) {
      Alert.alert(
        'Informations manquantes',
        'Choisis une catégorie et une ville.',
      );
      return;
    }

    try {
      setSaving(true);

      let imageUrl = listing.image_url;

      if (newImage) {
        imageUrl = await uploadListingImage(newImage);
      }

      await updateListing(listing.id, {
        title: cleanTitle,
        description: cleanDescription,
        price_xof: numericPrice,
        category,
        city,
        image_url: imageUrl,
      });

      onSaved();
    } catch (error) {
      Alert.alert(
        'Modification impossible',
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue.',
      );
    } finally {
      setSaving(false);
    }
  }

  const imageUri = newImage ?? getListingImageUri(listing.image_url);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onCancel}>
        <Text style={styles.back}>‹ Retour à Mes publications</Text>
      </Pressable>

      <Text style={styles.heading}>Modifier l’annonce</Text>

      {imageUri && <ZoomableImage uri={imageUri} height={220} />}

      <Pressable
        onPress={() => void chooseImage()}
        style={styles.photoButton}
      >
        <Text style={styles.photoText}>Changer la photo</Text>
      </Pressable>

      <Text style={styles.label}>Nom de l’objet</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        style={styles.input}
      />

      <Text style={styles.label}>Prix en FCFA</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.options}>
        {availableCategories.map((item) => {
          const selected = category === item;

          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[
                styles.option,
                selected && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Ville</Text>
      <View style={styles.options}>
        {cities.map((item) => {
          const selected = city === item;

          return (
            <Pressable
              key={item}
              onPress={() => setCity(item)}
              style={[
                styles.option,
                selected && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.description]}
      />

      <Pressable
        onPress={() => void save()}
        disabled={saving}
        style={[styles.button, saving && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  content: {
    padding: 20,
    paddingTop: 44,
    paddingBottom: 36,
  },
  back: {
    color: '#176B5B',
    fontWeight: '700',
    marginBottom: 18,
  },
  heading: {
    color: '#202522',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 18,
  },
  photoButton: {
    paddingVertical: 12,
  },
  photoText: {
    color: '#176B5B',
    fontWeight: '700',
  },
  label: {
    color: '#202522',
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7E3',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: '#202522',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#D7DEDA',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  optionSelected: {
    backgroundColor: '#E5F0EC',
    borderColor: '#176B5B',
  },
  optionText: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#176B5B',
  },
  description: {
    minHeight: 110,
    paddingTop: 12,
  },
  button: {
    minHeight: 50,
    backgroundColor: '#176B5B',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});