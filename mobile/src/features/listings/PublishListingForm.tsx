import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import ZoomableImage from '../../components/ui/ZoomableImage';
import { getCurrentListingPosition } from '../../lib/location';
import {
  createListing,
  uploadListingImage,
} from '../../lib/api/listings';

type PublishListingFormProps = {
  onCancel: () => void;
  onPublished: () => void;
};

const categories = [
  'Vêtements',
  'Électronique',
  'Maison',
  'BTP',
  'Autre',
];

const cities = ['Cotonou', 'Parakou'];

export default function PublishListingForm({
  onCancel,
  onPublished,
}: PublishListingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Électronique');
  const [city, setCity] = useState('Cotonou');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function chooseImage() {
    setError(null);

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        'Autorise BIZNESS à accéder à tes photos pour ajouter une image.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handlePublish() {
    setError(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const numericPrice = Number(price);

    if (!imageUri) {
      setError('Ajoute une photo de ton produit avant de publier.');
      return;
    }

    if (cleanTitle.length < 3) {
      setError('Le titre doit contenir au moins 3 caractères.');
      return;
    }

    if (cleanDescription.length < 5) {
      setError('La description doit contenir au moins 5 caractères.');
      return;
    }

    if (!Number.isInteger(numericPrice) || numericPrice <= 0) {
      setError('Saisis un prix entier en FCFA supérieur à zéro.');
      return;
    }

    try {
      setLoading(true);

      // L’autorisation est demandée au moment où l’utilisateur publie.
      // Si elle est refusée, l’annonce est publiée sans coordonnées GPS.
      const coordinates = await getCurrentListingPosition();
      const imageUrl = await uploadListingImage(imageUri);

      await createListing({
        title: cleanTitle,
        description: cleanDescription,
        price_xof: numericPrice,
        category,
        city,
        image_url: imageUrl,
        ...(coordinates ?? {}),
      });

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'La publication a échoué. Vérifie la connexion au backend.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successScreen}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.title}>Annonce publiée</Text>
        <Text style={styles.subtitle}>
          Ton annonce et sa photo sont visibles dans les annonces.
        </Text>

        <Pressable style={styles.button} onPress={onPublished}>
          <Text style={styles.buttonText}>Retour aux annonces</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onCancel} style={styles.backButton}>
        <Text style={styles.backText}>‹ Retour à l’accueil</Text>
      </Pressable>

      <Text style={styles.title}>Publier une annonce</Text>
      <Text style={styles.subtitle}>
        Présente ton produit aux acheteurs du Bénin.
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.label}>Photo du produit</Text>

      {imageUri ? (
        <View>
          <ZoomableImage uri={imageUri} height={210} />

          <Pressable onPress={chooseImage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Changer la photo</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={chooseImage} style={styles.imagePicker}>
          <Text style={styles.imageIcon}>＋</Text>
          <Text style={styles.imagePickerTitle}>Ajouter une photo</Text>
          <Text style={styles.imagePickerHint}>
            JPG, PNG ou WEBP • 5 Mo maximum
          </Text>
        </Pressable>
      )}

      <Text style={styles.label}>Titre du produit</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ex. Téléphone Samsung"
        placeholderTextColor="#8A918D"
        maxLength={100}
        style={styles.input}
      />

      <Text style={styles.label}>Prix (FCFA)</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Ex. 50000"
        placeholderTextColor="#8A918D"
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.options}>
        {categories.map((item) => {
          const selected = category === item;

          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[styles.option, selected && styles.optionSelected]}
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
              style={[styles.option, selected && styles.optionSelected]}
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
        placeholder="Décris l’état du produit et ses caractéristiques."
        placeholderTextColor="#8A918D"
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.descriptionInput]}
      />

      <Pressable
        onPress={() => void handlePublish()}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Publier l’annonce</Text>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 36,
  },
  successScreen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    color: '#176B5B',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 22,
  },
  backText: {
    color: '#176B5B',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: '#202522',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B746F',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  label: {
    color: '#202522',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    minHeight: 50,
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7E3',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#202522',
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 14,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#DCE4DF',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  optionSelected: {
    backgroundColor: '#E5F0EC',
    borderColor: '#176B5B',
  },
  optionText: {
    color: '#555F5A',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#176B5B',
  },
  imagePicker: {
    height: 155,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#8DB7AA',
    borderRadius: 14,
    backgroundColor: '#EFF6F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    color: '#176B5B',
    fontSize: 30,
    fontWeight: '500',
  },
  imagePickerTitle: {
    color: '#176B5B',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  imagePickerHint: {
    color: '#6B746F',
    fontSize: 12,
    marginTop: 5,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: '#176B5B',
    fontWeight: '700',
  },
  button: {
    minHeight: 52,
    backgroundColor: '#176B5B',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 26,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FFF1EF',
    borderColor: '#F1C7C2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#A83224',
    fontSize: 14,
  },
});