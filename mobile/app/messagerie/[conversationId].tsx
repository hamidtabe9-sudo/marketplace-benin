import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import {
  getConversationMessages,
  sendConversationMessage,
  type ChatMessage,
} from '../../src/lib/api/messaging';

const BRAND = '#176B5B';

export default function ConversationScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    conversationId?: string;
    otherUserName?: string;
    listingTitle?: string;
  }>();

  const conversationId = Number(params.conversationId);
  const otherUserName = params.otherUserName ?? 'Discussion';
  const listingTitle = params.listingTitle ?? 'Annonce';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      setError('Identifiant de conversation invalide.');
      setLoading(false);
      return;
    }

    let active = true;

    async function refreshMessages(showLoader: boolean) {
      try {
        if (showLoader && active) {
          setLoading(true);
        }

        const result = await getConversationMessages(conversationId);

        if (active) {
          setMessages(result);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger les messages.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void refreshMessages(true);

    const timer = setInterval(() => {
      void refreshMessages(false);
    }, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  async function handleSend() {
    const body = draft.trim();

    if (!body || sending) {
      return;
    }

    try {
      setSending(true);
      setError('');

      const sentMessage = await sendConversationMessage(
        conversationId,
        body,
      );

      setMessages((current) => [...current, sentMessage]);
      setDraft('');

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      Alert.alert(
        'Message non envoyé',
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isMine = item.sender_id === user?.id;

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.myBubble : styles.otherBubble,
          ]}
        >
          {!isMine && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}

          <Text style={[styles.messageText, isMine && styles.myMessageText]}>
            {item.body}
          </Text>

          <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft color={BRAND} size={23} strokeWidth={2.8} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

          <Text numberOfLines={1} style={styles.personName}>
            {otherUserName}
          </Text>

          <Text numberOfLines={1} style={styles.listingTitle}>
            {listingTitle}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={styles.helper}>Chargement des messages…</Text>
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.chatArea}>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Aucun message pour le moment. Écris le premier message.
                </Text>
              }
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
            />

            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Écris ton message…"
                placeholderTextColor="#89918D"
                multiline
                maxLength={2000}
                textAlignVertical="center"
                style={styles.input}
              />

              <Pressable
                onPress={() => void handleSend()}
                disabled={!draft.trim() || sending}
                style={[
                  styles.sendButton,
                  (!draft.trim() || sending) && styles.sendButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le message"
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendText}>Envoyer</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE9',
  },
  backButton: {
    minHeight: 46,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 8,
    borderRadius: 13,
    backgroundColor: '#EAF3EF',
    borderWidth: 1,
    borderColor: '#C9DED5',
  },
  backText: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '800',
  },
  personName: {
    color: '#202522',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  listingTitle: {
    color: '#6B746F',
    fontSize: 13,
    marginTop: 3,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  messageRow: {
    width: '100%',
    marginVertical: 5,
  },
  myMessageRow: {
    alignItems: 'flex-end',
  },
  otherMessageRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    minWidth: 90,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 7,
  },
  myBubble: {
    backgroundColor: BRAND,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    color: '#202522',
    fontSize: 15,
    lineHeight: 21,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    color: '#89918D',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
  },
  myMessageTime: {
    color: '#D5E9E3',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECE9',
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    color: '#202522',
    backgroundColor: '#F3F5F3',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  helper: {
    color: '#6B746F',
    marginTop: 10,
  },
  emptyText: {
    color: '#6B746F',
    textAlign: 'center',
    marginVertical: 20,
  },
  errorText: {
    color: '#A33B34',
    textAlign: 'center',
  },
  inlineError: {
    color: '#A33B34',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
});