import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { openConversation } from '../../lib/api/messaging';

type ContactSellerButtonProps = {
  listingId: number;
  listingTitle: string;
};

const BRAND = '#176B5B';

export default function ContactSellerButton({
  listingId,
  listingTitle,
}: ContactSellerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleContactSeller() {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const conversation = await openConversation(listingId);

      router.push({
        pathname: '/messagerie/[conversationId]',
        params: {
          conversationId: String(conversation.id),
          otherUserName: conversation.other_user_name,
          listingTitle: conversation.listing_title ?? listingTitle,
        },
      } as unknown as Href);
    } catch (error) {
      Alert.alert(
        'Impossible de contacter le vendeur',
        error instanceof Error ? error.message : 'Une erreur est survenue.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={() => void handleContactSeller()}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>Contacter le vendeur</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});