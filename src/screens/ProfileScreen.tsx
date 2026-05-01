import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { usePassengerStats } from '../hooks/usePassengerStats'
import Toast from '../components/Toast'
import { uploadProfilePhoto, uploadVehiclePhoto } from '../services/photoUpload'

export default function ProfileScreen() {
  const navigation = useNavigation()
  const { user, logout: logoutStore } = useAppStore()
  const { logout: logoutAuth } = useAuth()
  const { profile, loading, switchRole, fetchProfile } = useProfile(user?.id)
  const { stats: passengerStats, loading: statsLoading, refetch: refetchStats } = usePassengerStats(user?.id)

  const [isDriver, setIsDriver]                     = useState(false)
  const [isLoading, setIsLoading]                   = useState(false)
  const [uploadingPhoto, setUploadingPhoto]         = useState(false)
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false)
  const [vehiclePhotoError, setVehiclePhotoError]   = useState(false)
  const [shouldLogout, setShouldLogout]             = useState(false)
  const [toastVisible, setToastVisible]             = useState(false)
  const [toastMessage, setToastMessage]             = useState('')
  const [toastType, setToastType]                   = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    if (profile?.role) setIsDriver(profile.role === 'driver')
  }, [profile?.role])

  useFocusEffect(
    useCallback(() => {
      if (!isDriver) refetchStats()
    }, [isDriver, refetchStats])
  )

  useEffect(() => {
    if (shouldLogout) { performLogout(); setShouldLogout(false) }
  }, [shouldLogout])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message); setToastType(type); setToastVisible(true)
  }

  // ── Role switch ────────────────────────────────────────────────────────────
  const handleRoleSwitch = async (newRole: 'driver' | 'passenger') => {
    if (!user?.id || isLoading) return
    if (newRole === 'driver' && !isDriver) {
      navigation.navigate('DriverOnboarding' as never); return
    }
    try {
      setIsLoading(true)
      const result = await switchRole(user.id, newRole)
      if (result) {
        setIsDriver(result.role === 'driver')
        showToast(`Ahora eres ${newRole === 'driver' ? 'conductor' : 'pasajero'}`)
      }
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el rol. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar', style: 'destructive', onPress: () => setShouldLogout(true) },
      ],
      { cancelable: false }
    )
  }

  const performLogout = async () => {
    try {
      showToast('Cerrando sesión...', 'info')
      await logoutAuth()
      logoutStore()
    } catch {
      logoutStore()
    }
  }

  // ── Photo uploads ──────────────────────────────────────────────────────────
  const handleProfilePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      })
      if (!result.canceled && result.assets[0] && user?.id) {
        setUploadingPhoto(true)
        await uploadProfilePhoto(user.id, result.assets[0].uri)
        await fetchProfile(user.id)
        showToast('Foto de perfil actualizada')
      }
    } catch (error: any) {
      showToast(error.message || 'Error al subir la foto', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleVehiclePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true, aspect: [4, 3], quality: 0.8,
      })
      if (!result.canceled && result.assets[0] && user?.id) {
        setUploadingVehiclePhoto(true)
        await uploadVehiclePhoto(user.id, null, result.assets[0].uri)
        await fetchProfile(user.id)
        showToast('Foto del vehículo actualizada')
      }
    } catch (error: any) {
      showToast(error.message || 'Error al subir la foto', 'error')
    } finally {
      setUploadingVehiclePhoto(false)
    }
  }

  const showPhotoOptions = () =>
    Alert.alert('Foto de Perfil', '¿Qué deseas hacer?', [
      { text: 'Cambiar foto', onPress: handleProfilePhotoUpload },
      { text: 'Cancelar', style: 'cancel' },
    ])

  const showVehiclePhotoOptions = () =>
    Alert.alert('Foto del Vehículo', '¿Qué deseas hacer?', [
      { text: 'Cargar foto', onPress: handleVehiclePhotoUpload },
      { text: 'Cancelar', style: 'cancel' },
    ])

  // ── Derived values ─────────────────────────────────────────────────────────
  const avatarUri  = user?.avatar_url || profile?.avatar_url
  const totalTrips = isDriver ? (profile?.total_trips ?? 0) : (passengerStats?.totalTrips ?? 0)
  const rating     = profile?.rating?.toFixed(1) ?? '0.0'

  // ── Avatar renderer ────────────────────────────────────────────────────────
  const renderAvatar = () => (
    <TouchableOpacity style={styles.avatarWrap} onPress={showPhotoOptions} disabled={uploadingPhoto} activeOpacity={0.85}>
      {uploadingPhoto ? (
        <View style={styles.avatarPlaceholder}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.cameraBadge}>
        <Ionicons name="camera" size={14} color="#fff" />
      </View>
    </TouchableOpacity>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ══ HERO GRADIENT HEADER ════════════════════════════════════════ */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBg}
        >
          {/* Top row */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroTopSpacer} />
            <Text style={styles.heroScreenTitle}>Mi Perfil</Text>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          {/* Avatar + info */}
          <View style={styles.heroBody}>
            {renderAvatar()}
            <Text style={styles.heroName}>{user?.name || 'Usuario'}</Text>
            <Text style={styles.heroEmail}>{user?.email || ''}</Text>
            <View style={styles.heroRatingRow}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.heroRating}>{rating}</Text>
              <Text style={styles.heroRatingDot}>·</Text>
              <Text style={styles.heroTrips}>{totalTrips} viajes</Text>
            </View>
          </View>

          {/* Curved white bottom */}
          <View style={styles.heroCurve} />
        </LinearGradient>

        {/* ══ ROLE SELECTOR ═══════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ROL ACTUAL</Text>
          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleBtn, !isDriver && styles.roleBtnActive]}
              onPress={() => handleRoleSwitch('passenger')}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name={!isDriver ? 'person' : 'person-outline'} size={18} color={!isDriver ? '#fff' : COLORS.textSecondary} />
              <Text style={[styles.roleBtnText, !isDriver && styles.roleBtnTextActive]}>Pasajero</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, isDriver && styles.roleBtnActive]}
              onPress={() => handleRoleSwitch('driver')}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name={isDriver ? 'car' : 'car-outline'} size={18} color={isDriver ? '#fff' : COLORS.textSecondary} />
              <Text style={[styles.roleBtnText, isDriver && styles.roleBtnTextActive]}>Conductor</Text>
            </TouchableOpacity>
            {isLoading && <ActivityIndicator size="small" color={COLORS.primary} style={StyleSheet.absoluteFillObject} />}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : !isDriver ? (
          <>
            {/* ── STATS ────────────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MI ACTIVIDAD</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{passengerStats?.totalTrips ?? 0}</Text>
                  <Text style={styles.statLabel}>Viajes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    ${(passengerStats?.totalSpent ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={styles.statLabel}>Gastado</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{rating}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            </View>

            {/* ── CUENTA ───────────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CUENTA</Text>
              <View style={styles.menuCard}>
                <MenuItem icon="location-outline" label="Mis direcciones"   onPress={() => navigation.navigate('SavedAddresses' as never)} />
                <MenuDivider />
                <MenuItem icon="card-outline"     label="Métodos de pago"  onPress={() => navigation.navigate('PaymentMethods' as never)} />
                <MenuDivider />
                <MenuItem icon="notifications-outline" label="Notificaciones" onPress={() => navigation.navigate('Notifications' as never)} />
                <MenuDivider />
                <MenuItem icon="shield-checkmark-outline" label="Seguridad" onPress={() => navigation.navigate('Security' as never)} last />
              </View>
            </View>

            {/* ── MIS VIAJES ───────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MIS VIAJES</Text>
              <View style={styles.menuCard}>
                <MenuItem icon="navigate-circle-outline" iconColor={COLORS.success} label="Viajes Activos"     onPress={() => navigation.navigate('ActiveTrips' as never)} />
                <MenuDivider />
                <MenuItem icon="time-outline"            label="Historial de Viajes" onPress={() => navigation.navigate('TripHistory' as never)} />
                <MenuDivider />
                <MenuItem icon="star-outline"            iconColor={COLORS.warning}  label="Reseñas y Ratings" onPress={() => navigation.navigate('Reviews' as never)} last />
              </View>
            </View>

            {/* ── DRIVER CTA ───────────────────────────────────────────── */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.driverCta} onPress={() => handleRoleSwitch('driver')} activeOpacity={0.88}>
                <LinearGradient
                  colors={[`${COLORS.primary}12`, `${COLORS.primary}06`]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.driverCtaInner}
                >
                  <View style={styles.driverCtaIcon}>
                    <Ionicons name="car" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.driverCtaText}>
                    <Text style={styles.driverCtaTitle}>Conviértete en conductor</Text>
                    <Text style={styles.driverCtaSub}>Empieza a ganar dinero ahora</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* ── VEHICLE PHOTO ────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MI VEHÍCULO</Text>
              <TouchableOpacity
                style={styles.vehiclePhotoContainer}
                onPress={showVehiclePhotoOptions}
                disabled={uploadingVehiclePhoto}
                activeOpacity={0.85}
              >
                {uploadingVehiclePhoto ? (
                  <View style={styles.vehiclePhotoEmpty}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  </View>
                ) : profile?.vehicle_photo_url && !vehiclePhotoError ? (
                  <>
                    <Image
                      source={{ uri: profile.vehicle_photo_url }}
                      style={styles.vehiclePhotoImg}
                      onError={() => setVehiclePhotoError(true)}
                      onLoad={() => setVehiclePhotoError(false)}
                    />
                    <View style={styles.vehiclePhotoBadge}>
                      <Ionicons name="camera" size={22} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={styles.vehiclePhotoEmpty}>
                    <Ionicons name="car" size={48} color={COLORS.primary} />
                    <Text style={styles.vehiclePhotoEmptyText}>Agregar foto del vehículo</Text>
                    <Text style={styles.vehiclePhotoEmptySub}>Toca para seleccionar</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── CONDUCTOR MENU ───────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GESTIÓN</Text>
              <View style={styles.menuCard}>
                <MenuItem icon="car-outline"           label="Mi vehículo"    onPress={() => navigation.navigate('VehicleInfo' as never)} />
                <MenuDivider />
                <MenuItem icon="document-text-outline" label="Documentos"     onPress={() => navigation.navigate('DriverDocuments' as never)} />
                <MenuDivider />
                <MenuItem icon="wallet-outline"        label="Ganancias"      onPress={() => navigation.navigate('Earnings' as never)} />
                <MenuDivider />
                <MenuItem icon="stats-chart-outline"   label="Estadísticas"   onPress={() => navigation.navigate('Stats' as never)} last />
              </View>
            </View>

            {/* ── ACTIONS ──────────────────────────────────────────────── */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('DriverRegister' as never)}
                activeOpacity={0.88}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Crear Nueva Ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('DriverPanel' as never)}
                activeOpacity={0.85}
              >
                <Ionicons name="speedometer" size={20} color={COLORS.primary} />
                <Text style={styles.secondaryBtnText}>Panel del Conductor</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── ADMIN ───────────────────────────────────────────────────────── */}
        {profile?.role === 'support' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminDocuments' as never)} activeOpacity={0.8}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              <Text style={styles.adminBtnText}>Verificar Documentos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOGOUT ──────────────────────────────────────────────────────── */}
        <View style={[styles.section, { marginBottom: SPACING.xxxl }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface MenuItemProps {
  icon: string
  label: string
  onPress: () => void
  iconColor?: string
  last?: boolean
}
const MenuItem = ({ icon, label, onPress, iconColor, last }: MenuItemProps) => (
  <TouchableOpacity style={[styles.menuItem, last && styles.menuItemLast]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, iconColor && { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon as any} size={19} color={iconColor ?? COLORS.primary} />
    </View>
    <Text style={styles.menuText}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
  </TouchableOpacity>
)
const MenuDivider = () => <View style={styles.menuDivider} />

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroBg: {
    paddingTop: SPACING.md,
    paddingBottom: 0,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  heroTopSpacer: { width: 44 },
  heroScreenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 44, height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBody: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  avatarWrap: {
    width: 90, height: 90,
    borderRadius: 45,
    marginBottom: SPACING.md,
    position: 'relative',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarImg: {
    width: 84, height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84, height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: SPACING.sm,
  },
  heroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroRating: { fontSize: 14, fontWeight: '700', color: '#fff' },
  heroRatingDot: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  heroTrips: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  heroCurve: {
    height: 28,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // ── Section ──────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // ── Role Toggle ───────────────────────────────────────────────────────────────
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.sm, borderRadius: RADIUS.sm - 2,
    gap: SPACING.sm,
  },
  roleBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  roleBtnTextActive: { color: '#fff' },

  // ── Stats ─────────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCard: {
    flex: 1, alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
  },
  statValue: {
    fontSize: 20, fontWeight: '800',
    color: COLORS.primary, letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12, fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // ── Loading ───────────────────────────────────────────────────────────────────
  loadingBox: {
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
  },

  // ── Menu Card ─────────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuDivider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 68 },
  menuIcon: {
    width: 38, height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: {
    flex: 1, fontSize: 15, fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // ── Driver CTA ────────────────────────────────────────────────────────────────
  driverCta: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  driverCtaInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, gap: SPACING.md,
  },
  driverCtaIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center', alignItems: 'center',
  },
  driverCtaText: { flex: 1, gap: 3 },
  driverCtaTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  driverCtaSub:   { fontSize: 13, color: COLORS.textSecondary },

  // ── Vehicle Photo ─────────────────────────────────────────────────────────────
  vehiclePhotoContainer: {
    height: 200, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12, elevation: 3,
  },
  vehiclePhotoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  vehiclePhotoEmpty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
  },
  vehiclePhotoEmptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  vehiclePhotoEmptySub:  { fontSize: 13, color: COLORS.textTertiary },
  vehiclePhotoBadge: {
    position: 'absolute', bottom: SPACING.md, right: SPACING.md,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 52,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 7,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, height: 52,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  secondaryBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.primary },

  adminBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.md, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  adminBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: `${COLORS.error}25`,
    backgroundColor: `${COLORS.error}06`,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: COLORS.error },
})
