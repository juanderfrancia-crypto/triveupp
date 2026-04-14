import React, { useState, useRef } from 'react'
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
  Animated,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import { logLogin } from '../services/activityLogger'
import OfflineBanner from '../components/OfflineBanner'
import Toast from '../components/Toast'

export default function LoginPhoneScreen() {
  const navigation = useNavigation()
  const { setUser, setAuthUser } = useAppStore()
  const { signInWithOTP, verifyOTP, loading: authLoading, error: authError } = useAuth()

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [errors, setErrors] = useState<{ phone?: string; otp?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const validatePhone = () => {
    const newErrors: { phone?: string } = {}
    if (!phone.trim()) {
      newErrors.phone = 'El número telefónico es requerido'
    } else if (!/^\d{7,}$/.test(phone.replace(/[^\d]/g, ''))) {
      newErrors.phone = 'Ingresa un número válido (mínimo 7 dígitos)'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
  }

  const validateOTP = () => {
    const newErrors: { otp?: string } = {}
    if (!otp.trim()) {
      newErrors.otp = 'El código OTP es requerido'
    } else if (otp.length < 6) {
      newErrors.otp = 'El código debe tener 6 dígitos'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendOTP = async () => {
    if (!validatePhone()) return
    try {
      setIsSubmitting(true)
      await signInWithOTP(phone)
      setStep('otp')
      errorHandler.handle(
        `✅ Código enviado al ${phone}. Válido por 10 minutos.`,
        ErrorType.UNKNOWN,
        ErrorSeverity.LOW,
        true,
        { context: 'otp_sent', phone }
      )
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión a internet',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'otp_send_network' }
        )
      } else if (err.message?.includes('rate')) {
        errorHandler.handle(
          'Demasiados intentos. Por favor espera unos minutos.',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'otp_rate_limit' }
        )
      } else {
        errorHandler.handle(
          err,
          ErrorType.UNKNOWN,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'otp_send_error', phone }
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return
    try {
      setIsSubmitting(true)
      const data = await verifyOTP(phone, otp)
      if (data?.user) {
        const { data: profile, error: fetchError } = await (await import('../services/supabase')).supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()

        if (fetchError && fetchError.code !== 'PGRST116') {
          errorHandler.handleSupabaseError(fetchError, 'fetch_profile_phone', { userId: data.user.id })
          return
        }

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            rating: profile.rating,
            balance: profile.balance || 0,
            membership_type: profile.membership_type || 'free',
            membership_expiry: profile.membership_expiry,
          })
        } else {
          const userName = data.user.user_metadata?.full_name || 'Usuario'
          const userEmail = data.user.email || `${phone}@sms.local`

          const { data: insertedProfile, error: insertError } = await (await import('../services/supabase')).supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              name: userName,
              email: userEmail,
              phone,
              role: 'passenger',
            }])
            .select()
            .single()

          if (insertError) {
            errorHandler.handleSupabaseError(insertError, 'create_profile_phone', { phone, email: userEmail })
            return
          }

          setUser({
            id: insertedProfile.id,
            name: insertedProfile.name,
            email: insertedProfile.email,
            phone: insertedProfile.phone,
            role: insertedProfile.role,
            rating: insertedProfile.rating || 0,
            balance: insertedProfile.balance || 0,
            membership_type: insertedProfile.membership_type || 'free',
            membership_expiry: insertedProfile.membership_expiry || null,
          })
        }
        setAuthUser(data.user)
        
        // Registrar actividad de login
        await logLogin(data.user.id)
        
        errorHandler.handle(
          '✅ Inicio de sesión exitoso',
          ErrorType.UNKNOWN,
          ErrorSeverity.LOW,
          true,
          { context: 'otp_verify_success', phone }
        )
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión a internet',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'otp_verify_network' }
        )
      } else if (err.message?.includes('invalid') || err.message?.includes('expired')) {
        errorHandler.handle(
          'El código OTP es inválido o expiró. Por favor solicita uno nuevo.',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'otp_invalid' }
        )
      } else {
        errorHandler.handle(
          err,
          ErrorType.AUTH,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'otp_verify_error', phone }
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep('phone')
    setOtp('')
    setErrors({})
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Background decorative circles 3D */}
      <View style={styles.bgContainer}>
        <LinearGradient
          colors={[COLORS.primaryLight + '35', COLORS.primary + '18', COLORS.primaryDark + '08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCircle, styles.gradientCircle1]}
        />
        <LinearGradient
          colors={[COLORS.primaryLight + '28', COLORS.primary + '14', COLORS.primaryDark + '06']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCircle, styles.gradientCircle2]}
        />
        <LinearGradient
          colors={[COLORS.primaryLight + '22', COLORS.primary + '12', COLORS.primaryDark + '04']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCircle, styles.gradientCircle3]}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>
              {step === 'phone' ? 'Ingresa tu número' : 'Verifica tu código'}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <Text style={styles.welcomeText}>Iniciar con teléfono</Text>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Número telefónico</Text>
                  <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                    <Ionicons name="call-outline" size={20} color={errors.phone ? COLORS.error : COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: 300 123 4567"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text)
                        if (errors.phone) setErrors({ ...errors, phone: undefined })
                      }}
                      editable={!isSubmitting}
                    />
                  </View>
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>

                <Text style={styles.helpText}>
                  Recibirás un código de 6 dígitos para verificar tu identidad
                </Text>

                <TouchableOpacity
                  style={[styles.loginBtn, isSubmitting && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isSubmitting || authLoading}
                >
                  {isSubmitting || authLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Enviar código</Text>
                  )}
                </TouchableOpacity>

                {authError && <Text style={styles.errorText}>{authError}</Text>}

                {/* Divisor */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.orText}>o inicia sesión con</Text>
                  <View style={styles.divider} />
                </View>

                {/* Botones sociales deshabilitados */}
                <View style={styles.socialBtns}>
                  <TouchableOpacity style={[styles.socialBtn, styles.disabled]} disabled>
                    <Ionicons name="logo-google" size={20} color={COLORS.textTertiary} />
                    <Text style={[styles.socialBtnText, styles.disabledText]}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.socialBtn, styles.disabled]} disabled>
                    <Ionicons name="logo-apple" size={20} color={COLORS.textTertiary} />
                    <Text style={[styles.socialBtnText, styles.disabledText]}>Apple</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.welcomeText}>Verificación</Text>

                <View style={styles.otpInfoCard}>
                  <View style={styles.otpInfoIconContainer}>
                    <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                  </View>
                  <Text style={styles.otpInfoTitle}>Código enviado</Text>
                  <Text style={styles.otpInfoSubtitle}>Ingresa el código de 6 dígitos que recibiste en</Text>
                  <View style={styles.phoneContainer}>
                    <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.phoneNumberBig}>{phone}</Text>
                  </View>
                  <TouchableOpacity style={styles.changePhoneBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                    <Text style={styles.changePhoneText}>Cambiar número</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Código OTP</Text>
                  <View style={[styles.inputContainer, errors.otp && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color={errors.otp ? COLORS.error : COLORS.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="● ● ● ● ● ●"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text)
                        if (errors.otp) setErrors({ ...errors, otp: undefined })
                      }}
                      editable={!isSubmitting}
                    />
                  </View>
                  {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.loginBtn, isSubmitting && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isSubmitting || authLoading}
                >
                  {isSubmitting || authLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Verificar código</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleSendOTP}
                  disabled={isSubmitting}
                >
                  <Text style={styles.resendText}>¿No recibiste el código?</Text>
                  <Text style={styles.resendLink}> Reenviar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}> 
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)} disabled={isSubmitting}>
              <Text style={styles.footerLink}>Ingresar con correo</Text>
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

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Background decorative circles 3D
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  gradientCircle1: {
    top: -100,
    right: -80,
    width: 260,
    height: 260,
  },
  gradientCircle2: {
    top: 320,
    left: -120,
    width: 320,
    height: 320,
  },
  gradientCircle3: {
    bottom: 60,
    right: -100,
    width: 240,
    height: 240,
  },

  // Header
  header: {
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  logoImage: {
    width: 200,
    height: 120,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Card - Premium style from HomeScreen
  card: {
    backgroundColor: COLORS.surface + 'F5',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight + 'B3',
    ...SHADOWS.lg,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
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
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    gap: SPACING.sm,
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
    ...TYPOGRAPHY.label,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  helpText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.orangeSoft,
    borderTopWidth: 2.5,
    borderTopColor: COLORS.shadowWhiteMid,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.shadowWhiteDark,
  },
  loginBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
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
    gap: SPACING.md,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    height: 48,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1,
  },
  socialBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLORS.textTertiary,
  },
  otpInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  otpInfoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  otpInfoTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  otpInfoSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  phoneNumberBig: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  changePhoneText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  resendText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  resendLink: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
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
