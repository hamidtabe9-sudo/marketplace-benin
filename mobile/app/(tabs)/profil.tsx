import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useAuth } from '../../src/contexts/AuthContext';

const BRAND = '#176B5B';

function getInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'B';
}

function formatMemberSince(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date non disponible';
  }

  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert(
        'Déconnexion',
        'La session locale a été fermée, mais le serveur n’a pas répondu.',
      );
    }
  }

  function confirmSignOut() {
    Alert.alert(
      'Se déconnecter',
      'Veux-tu vraiment te déconnecter de BIZNESS ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => void handleSignOut(),
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Chargement du profil…</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={styles.emptyTitle}>Profil indisponible</Text>
        <Text style={styles.emptyText}>
          Connecte-toi pour consulter ton profil.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ESPACE PERSONNEL</Text>
            <Text style={styles.pageTitle}>Mon profil</Text>
          </View>

          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>B</Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(user.full_name)}
              </Text>
            </View>

            <View style={styles.identity}>
              <Text style={styles.fullName} numberOfLines={2}>
                {user.full_name}
              </Text>
              <Text style={styles.memberSince}>
                Membre depuis {formatMemberSince(user.created_at)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              user.email_verified
                ? styles.statusVerified
                : styles.statusUnverified,
            ]}
          >
            <Text style={styles.statusDot}>
              {user.email_verified ? '✓' : '!'}
            </Text>
            <Text
              style={[
                styles.statusText,
                user.email_verified
                  ? styles.statusVerifiedText
                  : styles.statusUnverifiedText,
              ]}
            >
              {user.email_verified
                ? 'Adresse e-mail vérifiée'
                : 'Adresse e-mail à vérifier'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mon activité</Text>

        <View style={styles.shortcuts}>
          <Pressable
            onPress={() => router.push('/(tabs)/mes-publications')}
            style={({ pressed }) => [
              styles.shortcutCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.shortcutIcon}>
              <SymbolView
                name={{
                  ios: 'square.stack.3d.up.fill',
                  android: 'list',
                  web: 'list',
                }}
                tintColor={BRAND}
                size={23}
              />
            </View>
            <Text style={styles.shortcutTitle}>Mes publications</Text>
            <Text style={styles.shortcutDescription}>
              Gérer mes annonces
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/messages')}
            style={({ pressed }) => [
              styles.shortcutCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.shortcutIcon}>
              <SymbolView
                name={{
                  ios: 'bubble.left.and.bubble.right.fill',
                  android: 'chat',
                  web: 'chat',
                }}
                tintColor={BRAND}
                size={23}
              />
            </View>
            <Text style={styles.shortcutTitle}>Messages</Text>
            <Text style={styles.shortcutDescription}>
              Mes conversations
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Informations du compte</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>@</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Adresse e-mail</Text>
              <Text style={styles.detailValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>☎</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Téléphone</Text>
              <Text style={styles.detailValue}>{user.phone}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>✓</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>État du compte</Text>
              <Text style={styles.detailValue}>
                {user.email_verified ? 'Compte actif' : 'E-mail à vérifier'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityTitle}>Sécurité de ton compte</Text>
          <Text style={styles.securityText}>
            Ne partage jamais ton mot de passe ni les codes reçus par e-mail.
          </Text>
        </View>

        <Pressable
          onPress={confirmSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.signOutIcon}>↪</Text>
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.footer}>BIZNESS · Le marché près de chez toi</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  eyebrow: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: '#202522',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 4,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7ECE8',
    shadowColor: '#173D32',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4F1EC',
    marginRight: 14,
  },
  avatarText: {
    color: BRAND,
    fontSize: 24,
    fontWeight: '800',
  },
  identity: {
    flex: 1,
  },
  fullName: {
    color: '#202522',
    fontSize: 19,
    fontWeight: '800',
  },
  memberSince: {
    color: '#77817B',
    fontSize: 13,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 16,
  },
  statusVerified: {
    backgroundColor: '#E9F6EF',
  },
  statusUnverified: {
    backgroundColor: '#FFF4E5',
  },
  statusDot: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusVerifiedText: {
    color: '#287349',
  },
  statusUnverifiedText: {
    color: '#A56414',
  },
  sectionTitle: {
    color: '#26312B',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 11,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 12,
  },
  shortcutCard: {
    flex: 1,
    minHeight: 137,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7ECE8',
    padding: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3EF',
    marginBottom: 11,
  },
  shortcutTitle: {
    color: '#202522',
    fontSize: 14,
    fontWeight: '800',
  },
  shortcutDescription: {
    color: '#78827D',
    fontSize: 12,
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7ECE8',
    paddingHorizontal: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F5F2',
    marginRight: 12,
  },
  detailIconText: {
    color: BRAND,
    fontSize: 17,
    fontWeight: '800',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: '#78827D',
    fontSize: 12,
  },
  detailValue: {
    color: '#26312B',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#EDF0EE',
  },
  securityNote: {
    backgroundColor: '#EAF3EF',
    borderRadius: 15,
    padding: 15,
    marginTop: 18,
  },
  securityTitle: {
    color: BRAND,
    fontSize: 14,
    fontWeight: '800',
  },
  securityText: {
    color: '#52645B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  signOutButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7C8C5',
    backgroundColor: '#FFF8F7',
    marginTop: 22,
  },
  signOutIcon: {
    color: '#A33B34',
    fontSize: 19,
    fontWeight: '700',
    marginRight: 8,
  },
  signOutText: {
    color: '#A33B34',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    color: '#929B96',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F5',
    padding: 24,
  },
  loadingText: {
    color: '#6B746F',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#202522',
    fontSize: 19,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B746F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});