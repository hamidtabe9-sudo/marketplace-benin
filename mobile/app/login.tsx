import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import {
  loginAccount,
  registerAccount,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '../src/lib/api/auth';
import { useAuth } from '../src/contexts/AuthContext';

type Mode =
  | 'login'
  | 'register'
  | 'verify_email'
  | 'forgot_password'
  | 'reset_password';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
}: PasswordFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordInputContainer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#89918D"
          style={styles.passwordInput}
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="done"
        />

        <Pressable
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={styles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={
            passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
          }
          hitSlop={8}
        >
          {passwordVisible ? (
            <EyeOff size={22} color="#176B5B" />
          ) : (
            <Eye size={22} color="#176B5B" />
          )}
        </Pressable>
      </View>
    </>
  );
}

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function changeMode(next: Mode) {
    setError(null);
    setNotice(null);
    setMode(next);
  }

  async function handleSubmit() {
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setError('Saisis ton e-mail ou téléphone et ton mot de passe.');
        return;
      }
    } else if (mode === 'register') {
      if (fullName.trim().length < 2) {
        setError('Saisis ton nom complet.');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('Saisis une adresse e-mail valide.');
        return;
      }

      if (phone.trim().length < 8) {
        setError('Saisis un numéro de téléphone valide.');
        return;
      }

      if (password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
    } else if (mode === 'verify_email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('Saisis une adresse e-mail valide.');
        return;
      }

      if (!/^\d{6}$/.test(code.trim())) {
        setError('Saisis le code à 6 chiffres reçu par e-mail.');
        return;
      }
    } else if (mode === 'forgot_password') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('Saisis une adresse e-mail valide.');
        return;
      }
    } else {
      if (!/^\d{6}$/.test(code.trim())) {
        setError('Saisis le code à 6 chiffres reçu par e-mail.');
        return;
      }

      if (password.length < 8) {
        setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === 'login') {
        const user = await loginAccount({
          identifier: identifier.trim(),
          password,
        });
        signIn(user);
      } else if (mode === 'register') {
        const message = await registerAccount({
          full_name: fullName.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          password,
        });

        setCode('');
        setMode('verify_email');
        setNotice(message);
      } else if (mode === 'verify_email') {
        const user = await verifyEmail({
          email: normalizedEmail,
          code: code.trim(),
        });
        signIn(user);
      } else if (mode === 'forgot_password') {
        const message = await requestPasswordReset(normalizedEmail);

        setCode('');
        setPassword('');
        setConfirmPassword('');
        setMode('reset_password');
        setNotice(
          `${message} Si tu ne reçois rien, vérifie l’adresse ou réessaie plus tard.`,
        );
      } else {
        const message = await resetPassword({
          email: normalizedEmail,
          code: code.trim(),
          new_password: password,
        });

        setPassword('');
        setConfirmPassword('');
        setCode('');
        setMode('login');
        setNotice(message);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue. Réessaie.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode(purpose: 'verify' | 'reset') {
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Saisis une adresse e-mail valide.');
      return;
    }

    try {
      setLoading(true);

      const message =
        purpose === 'verify'
          ? await requestEmailVerification(normalizedEmail)
          : await requestPasswordReset(normalizedEmail);

      setNotice(message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible d’envoyer le code.',
      );
    } finally {
      setLoading(false);
    }
  }

  const title = {
    login: 'Bienvenue',
    register: 'Créer un compte',
    verify_email: 'Vérifie ton e-mail',
    forgot_password: 'Mot de passe oublié',
    reset_password: 'Nouveau mot de passe',
  }[mode];

  const subtitle = {
    login: 'Connecte-toi pour accéder à BIZNESS.',
    register: 'Inscris-toi pour acheter et vendre.',
    verify_email: 'Saisis le code à 6 chiffres envoyé à ton adresse.',
    forgot_password: 'Indique l’adresse liée à ton compte.',
    reset_password: 'Saisis le code reçu et choisis un nouveau mot de passe.',
  }[mode];

  const buttonLabel = {
    login: 'Se connecter',
    register: 'Créer mon compte',
    verify_email: 'Valider mon e-mail',
    forgot_password: 'Envoyer un code',
    reset_password: 'Modifier le mot de passe',
  }[mode];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>BIZNESS</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {mode === 'register' && (
          <>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ex. Awa Adégbidi"
              placeholderTextColor="#89918D"
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nom@exemple.com"
              placeholderTextColor="#89918D"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+229 97 00 00 00"
              placeholderTextColor="#89918D"
              style={styles.input}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <PasswordField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="8 caractères minimum"
            />
          </>
        )}

        {mode === 'login' && (
          <>
            <Text style={styles.label}>E-mail ou téléphone</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="nom@exemple.com ou +229..."
              placeholderTextColor="#89918D"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <PasswordField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="Ton mot de passe"
            />

            <Pressable
              style={styles.inlineButton}
              onPress={() => {
                setEmail(identifier.includes('@') ? identifier.trim() : '');
                changeMode('forgot_password');
              }}
            >
              <Text style={styles.linkText}>Mot de passe oublié ?</Text>
            </Pressable>
          </>
        )}

        {(mode === 'verify_email' ||
          mode === 'forgot_password' ||
          mode === 'reset_password') && (
          <>
            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nom@exemple.com"
              placeholderTextColor="#89918D"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </>
        )}

        {(mode === 'verify_email' || mode === 'reset_password') && (
          <>
            <Text style={styles.label}>Code à 6 chiffres</Text>
            <TextInput
              value={code}
              onChangeText={(value) =>
                setCode(value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              placeholderTextColor="#89918D"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="next"
            />

            <Pressable
              style={styles.inlineButton}
              onPress={() =>
                void resendCode(mode === 'verify_email' ? 'verify' : 'reset')
              }
              disabled={loading}
            >
              <Text style={styles.linkText}>Renvoyer un code</Text>
            </Pressable>
          </>
        )}

        {mode === 'reset_password' && (
          <>
            <PasswordField
              label="Nouveau mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="8 caractères minimum"
            />

            <PasswordField
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répète le nouveau mot de passe"
            />
          </>
        )}

        <Pressable
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={() => void handleSubmit()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
          )}
        </Pressable>

        {mode === 'login' && (
          <>
            <Pressable
              style={styles.modeButton}
              onPress={() => changeMode('register')}
            >
              <Text style={styles.modeButtonText}>
                Pas encore de compte ? Créer un compte
              </Text>
            </Pressable>

            <Pressable
              style={styles.modeButton}
              onPress={() => {
                const candidate = identifier.trim();
                if (candidate.includes('@')) {
                  setEmail(candidate);
                }
                changeMode('verify_email');
              }}
            >
              <Text style={styles.modeButtonText}>
                Vérifier mon adresse e-mail
              </Text>
            </Pressable>
          </>
        )}

        {mode !== 'login' && (
          <Pressable
            style={styles.modeButton}
            onPress={() => changeMode('login')}
          >
            <Text style={styles.modeButtonText}>Retour à la connexion</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
  },
  brand: {
    color: '#176B5B',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    color: '#202522',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
  },
  subtitle: {
    color: '#6B746F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 18,
  },
  label: {
    color: '#202522',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 7,
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
  passwordInputContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7E3',
    borderWidth: 1,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    color: '#202522',
    fontSize: 15,
  },
  passwordToggle: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 52,
    backgroundColor: '#176B5B',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modeButton: {
    alignItems: 'center',
    padding: 14,
  },
  inlineButton: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
  },
  linkText: {
    color: '#176B5B',
    fontSize: 14,
    fontWeight: '700',
  },
  modeButtonText: {
    color: '#176B5B',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FFF1EF',
    borderColor: '#F1C7C2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#A83224',
    fontSize: 14,
  },
  noticeBox: {
    backgroundColor: '#EAF6F1',
    borderColor: '#B8DDCE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  noticeText: {
    color: '#155F53',
    fontSize: 14,
  },
}); 