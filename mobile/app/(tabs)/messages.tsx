import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useRouter,
  type Href,
} from 'expo-router';

import {
  getMyConversations,
  type Conversation,
} from '../../src/lib/api/messaging';

const BRAND = '#176B5B';

export default function MessagesScreen() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      const result = await getMyConversations();
      setConversations(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les conversations.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations]),
  );

  function openChat(conversation: Conversation) {
    router.push({
      pathname: '/messagerie/[conversationId]',
      params: {
        conversationId: String(conversation.id),
        otherUserName: conversation.other_user_name,
        listingTitle: conversation.listing_title ?? 'Annonce',
      },
    } as unknown as Href);
  }

  function renderConversation({ item }: { item: Conversation }) {
    return (
      <Pressable
        onPress={() => openChat(item)}
        style={({ pressed }) => [
          styles.conversation,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.other_user_name.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.topLine}>
            <Text numberOfLines={1} style={styles.personName}>
              {item.other_user_name}
            </Text>

            <Text style={styles.date}>
              {item.last_message_at
                ? new Date(item.last_message_at).toLocaleDateString()
                : ''}
            </Text>
          </View>

          <Text numberOfLines={1} style={styles.listingTitle}>
            {item.listing_title ?? 'Annonce supprimée'}
          </Text>

          <Text numberOfLines={1} style={styles.lastMessage}>
            {item.last_message ?? 'Conversation démarrée. Envoie un message.'}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          Discute avec les acheteurs et les vendeurs.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.helper}>Chargement des conversations…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Impossible de charger les messages
          </Text>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            onPress={() => void loadConversations()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderConversation}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyList : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadConversations(true)}
              tintColor={BRAND}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.helper}>
                Ouvre une annonce et contacte son vendeur pour commencer.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE9',
  },
  title: {
    color: '#202522',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B746F',
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  conversation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0EE',
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F1ED',
    marginRight: 12,
  },
  avatarText: {
    color: BRAND,
    fontSize: 20,
    fontWeight: '800',
  },
  conversationContent: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  personName: {
    flex: 1,
    color: '#202522',
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    color: '#89918D',
    fontSize: 12,
  },
  listingTitle: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  lastMessage: {
    color: '#6B746F',
    fontSize: 14,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  helper: {
    color: '#6B746F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#202522',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBox: {
    margin: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFF0EF',
  },
  errorTitle: {
    color: '#A33B34',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#78332F',
    marginTop: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: BRAND,
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