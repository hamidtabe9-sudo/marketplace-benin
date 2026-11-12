import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { openConversation } from '../../lib/api/messaging';
import ZoomableImage from '../../components/ui/ZoomableImage';
import {
  getListingDetail,
  getListingImageUri,
  type ListingDetail as ListingDetailType,
} from '../../lib/api/listings';

type Props = {
  listingId: number;
  onBack: () => void;
};

const BRAND = '#176B5B';

export default function ListingDetails({ listingId, onBack }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<ListingDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [contactOptionsVisible, setContactOptionsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getListingDetail(listingId)
      .then((data) => {
        if (active) {
          setListing(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger cette annonce.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [listingId]);

  async function startChat() {
    if (!listing || openingChat) {
      return;
    }

    setContactOptionsVisible(false);

    try {
      setOpeningChat(true);

      const conversation = await openConversation(listing.id);

      router.push({
        pathname: '/messagerie/[conversationId]',
        params: {
          conversationId: String(conversation.id),
          otherUserName: conversation.other_user_name,
          listingTitle: conversation.listing_title ?? listing.title,
        },
      } as unknown as Href);
    } catch (err) {
      Alert.alert(
        'Impossible de contacter le vendeur',
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    } finally {
      setOpeningChat(false);
    }
  }

  async function openContact(url: string) {
    setContactOptionsVisible(false);

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Impossible d’ouvrir cette application de contact.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.muted}>Chargement de l’annonce…</Text>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.errorScreen} edges={['top', 'bottom']}>
        <View style={styles.stickyHeader}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Retour aux annonces"
          >
            <ArrowLeft color={BRAND} size={24} strokeWidth={2.5} />
            <Text style={styles.backText}>Retour aux annonces</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <Text style={styles.error}>{error || 'Annonce introuvable.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = getListingImageUri(listing.image_url);
  const price = `${new Intl.NumberFormat('fr-FR').format(listing.price_xof)} F CFA`;

  const phoneDigits = listing.seller_phone.replace(/\D/g, '');
  const whatsappNumber = phoneDigits.startsWith('229')
    ? phoneDigits
    : `229${phoneDigits}`;

  const isOwner = listing.owner_id === user?.id;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* En-tête fixe : le retour reste visible pendant le défilement. */}
      <View style={styles.stickyHeader}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour aux annonces"
        >
          <ArrowLeft color={BRAND} size={24} strokeWidth={2.5} />
          <Text style={styles.backText}>Retour aux annonces</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <ZoomableImage uri={imageUri} height={280} />
        ) : (
          <View style={styles.imageEmpty}>
            <Text style={styles.muted}>Pas de photo</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.title}>{listing.title}</Text>

          <Text style={styles.meta}>
            {listing.category} · 📍 {listing.city}
          </Text>

          <View style={styles.separator} />

          <Text style={styles.heading}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.separator} />

          <Text style={styles.heading}>Contacter le vendeur</Text>
          <Text style={styles.seller}>{listing.seller_name}</Text>

          {isOwner ? (
            <View style={styles.ownListingNotice}>
              <Text style={styles.ownListingNoticeText}>
                C’est ton annonce : tu ne peux pas démarrer une discussion
                avec toi-même.
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setContactOptionsVisible(true)}
              style={styles.contactButton}
              accessibilityRole="button"
              accessibilityLabel="Afficher les moyens de contacter le vendeur"
            >
              <View style={styles.contactButtonContent}>
                <MessageCircle color="#FFFFFF" size={21} />
                <Text style={styles.contactButtonText}>
                  Contacter le vendeur
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={contactOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactOptionsVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setContactOptionsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fermer les options de contact"
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Contacter le vendeur</Text>
            <Text style={styles.modalSubtitle}>
              Choisis un moyen de contact avec {listing.seller_name}.
            </Text>

            <View style={styles.contactOptionsRow}>
              <Pressable
                onPress={() => void startChat()}
                disabled={openingChat}
                style={styles.optionPressable}
                accessibilityRole="button"
                accessibilityLabel="Contacter par messagerie BIZNESS"
              >
                <View style={[styles.optionCard, styles.messageOptionCard]}>
                  {openingChat ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <MessageCircle color="#FFFFFF" size={25} />
                  )}
                  <Text style={styles.messageOptionLabel}>Messagerie</Text>
                  <Text style={styles.messageOptionHint}>BIZNESS</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() =>
                  void openContact(`https://wa.me/${whatsappNumber}`)
                }
                style={styles.optionPressable}
                accessibilityRole="button"
                accessibilityLabel="Contacter par WhatsApp"
              >
                <View style={[styles.optionCard, styles.whatsAppOptionCard]}>
                  <MessageCircle color={BRAND} size={25} />
                  <Text style={styles.optionLabel}>WhatsApp</Text>
                  <Text style={styles.optionHint}>Message direct</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() =>
                  void openContact(`mailto:${listing.seller_email}`)
                }
                style={styles.optionPressable}
                accessibilityRole="button"
                accessibilityLabel="Contacter par e-mail"
              >
                <View style={[styles.optionCard, styles.emailOptionCard]}>
                  <Mail color={BRAND} size={25} />
                  <Text style={styles.optionLabel}>E-mail</Text>
                  <Text style={styles.optionHint}>Écrire au vendeur</Text>
                </View>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setContactOptionsVisible(false)}
              style={styles.cancelButton}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    minHeight: 48,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EAF3EF',
  },
  backText: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7F8F6',
  },
  errorScreen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  imageEmpty: {
    height: 240,
    borderRadius: 18,
    backgroundColor: '#E5F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E8ECE9',
  },
  price: {
    color: BRAND,
    fontSize: 23,
    fontWeight: '800',
  },
  title: {
    color: '#202522',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 8,
  },
  meta: {
    color: '#59645F',
    fontSize: 13,
    marginTop: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#E8ECE9',
    marginVertical: 18,
  },
  heading: {
    color: '#202522',
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    color: '#4D5752',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8,
  },
  seller: {
    color: '#202522',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  contactButton: {
    minHeight: 58,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: BRAND,
    overflow: 'hidden',
  },
  contactButtonContent: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  ownListingNotice: {
    backgroundColor: '#EDF2EF',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },
  ownListingNoticeText: {
    color: '#59645F',
    fontSize: 13,
    lineHeight: 19,
  },
  muted: {
    color: '#6B746F',
    marginTop: 10,
    textAlign: 'center',
  },
  error: {
    color: '#A83224',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 28, 23, 0.48)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8DEDA',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#202522',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#6B746F',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 18,
  },
  contactOptionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 9,
  },
  optionPressable: {
    flex: 1,
    minWidth: 0,
  },
  optionCard: {
    minHeight: 116,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  messageOptionCard: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  whatsAppOptionCard: {
    backgroundColor: '#EAF5F1',
    borderColor: '#B8D8CF',
  },
  emailOptionCard: {
    backgroundColor: '#F4F6F5',
    borderColor: '#D8E0DD',
  },
  optionLabel: {
    color: '#173B34',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageOptionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  optionHint: {
    color: '#59645F',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  messageOptionHint: {
    color: '#E1F0EA',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  cancelText: {
    color: '#59645F',
    fontSize: 15,
    fontWeight: '700',
  },
});