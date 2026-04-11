import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

export default function LoginScreen() {
  const navigation = useNavigation()
  const { setUser, setAuthUser } = useAppStore()
  const { login, loading: authLoading, error: authError, signInWithApple, handleGoogleLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      newErrors.email = 'El correo es requerido'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Ingresa un correo válido'
    }
    if (!password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async () => {
    if (!validate()) return
    try {
      setIsSubmitting(true)
      const data = (await login(email.trim(), password)) as any
      if (data?.user) {
        const { data: profile } = await (await import('../services/supabase')).supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            rating: profile.rating,
          })
        }
        setAuthUser(data.user)
      }
    } catch (err: any) {
      Alert.alert('Error de Login', err.message || 'Credenciales incorrectas')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLoginPress = async () => {
    try {
      setSocialLoading(true)
      await handleGoogleLogin()
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo iniciar sesión con Google')
    } finally {
      setSocialLoading(false)
    }
  }

  const handleAppleLoginPress = async () => {
    try {
      setSocialLoading(true)
      const data = (await signInWithApple()) as any
      if (data?.user) {
        const { data: profile } = await (await import('../services/supabase')).supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            rating: profile.rating,
          })
        } else {
          const appleEmail = data.user.email || `user_${data.user.id}@apple.local`
          const appleName = data.user.user_metadata?.full_name || 'Usuario Apple'
          await (await import('../services/supabase')).supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              name: appleName,
              email: appleEmail,
              phone: '',
              role: 'passenger',
            }])
          setUser({
            id: data.user.id,
            name: appleName,
            email: appleEmail,
            phone: '',
            role: 'passenger',
            rating: 0,
          })
        }
        setAuthUser(data.user)
      }
    } catch (err: any) {
      if (err.code !== 'ERR_APPLE_SIGN_IN_CANCELLED') {
        Alert.alert('Error', 'No se pudo iniciar sesión con Apple')
      }
    } finally {
      setSocialLoading(false)
    }
  }

  return (
    <View style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Fondo con círculos decorativos */}
      <View style={styles.gradientBg}>
        <View style={styles.gradientCircle1} />
        <View style={styles.gradientCircle2} />
        <View style={styles.gradientCircle3} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>Trive</Text>
            <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.welcomeText}>Bienvenido de nuevo</Text>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color={errors.email ? COLORS.error : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="tucorreo@ejemplo.com"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  editable={!isSubmitting}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.error : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  editable={!isSubmitting}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Olvidaste tu contraseña */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('RecoveryAccount' as never)}
              disabled={isSubmitting}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Botón principal */}
            <TouchableOpacity
              style={[styles.loginBtn, (isSubmitting || authLoading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting || authLoading}
              activeOpacity={0.85}
            >
              {isSubmitting || authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            {authError && <Text style={styles.errorText}>{authError}</Text>}

            {/* Divisor */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.orText}>o continúa con</Text>
              <View style={styles.divider} />
            </View>

            {/* Botones sociales */}
            <View style={styles.socialBtns}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleLoginPress}
                disabled={isSubmitting || socialLoading}
              >
                {socialLoading ? (
                  <ActivityIndicator color={COLORS.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
                    <Text style={styles.socialBtnText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleAppleLoginPress}
                disabled={isSubmitting || socialLoading}
              >
                {socialLoading ? (
                  <ActivityIndicator color={COLORS.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color={COLORS.textPrimary} />
                    <Text style={styles.socialBtnText}>Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('LoginPhone' as never)} disabled={isSubmitting}>
              <Text style={styles.footerLink}>Ingresar con teléfono</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register' as never)} disabled={isSubmitting}>
              <Text style={styles.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.primary,
    opacity: 0.12,
  },
  gradientCircle2: {
    position: 'absolute',
    top: 200,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
  },
  gradientCircle3: {
    position: 'absolute',
    top: 450,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.accent,
    opacity: 0.06,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Header
  header: {
    paddingTop: 80,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  welcomeText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loginBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  orText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textTertiary,
    marginHorizontal: SPACING.md,
  },
  socialBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  socialBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  footerLink: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
})
