import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import Toast from '../components/Toast'
import { uploadProfilePhoto, uploadVehiclePhoto } from '../services/photoUpload'

export default function ProfileScreen() {
  const navigation = useNavigation()
  const { user, logout: logoutStore } = useAppStore()
  const { logout: logoutAuth } = useAuth()
  const { profile, loading, switchRole, fetchProfile } = useProfile(user?.id)
  const [isDriver, setIsDriver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false)
  const [vehiclePhotoError, setVehiclePhotoError] = useState(false)
  const [shouldLogout, setShouldLogout] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role) {
      setIsDriver(profile.role === 'driver')
    }
  }, [profile?.role])

  // Ejecutar logout cuando shouldLogout sea true
  useEffect(() => {
    if (shouldLogout) {
      performLogout()
      setShouldLogout(false)
    }
  }, [shouldLogout])

  const handleRoleSwitch = async (newRole: 'driver' | 'passenger') => {
    if (!user?.id) {
      Alert.alert('Error', 'No se pudo identificar tu cuenta')
      return
    }
    
    // Prevenir cambios múltiples simultáneos
    if (isLoading) return

    // If switching to driver, show onboarding first
    if (newRole === 'driver' && !isDriver) {
      navigation.navigate('DriverOnboarding' as never)
      return
    }
    
    try {
      setIsLoading(true)
      const result = await switchRole(user.id, newRole)
      if (result) {
        // Actualizar estado local inmediatamente
        setIsDriver(result.role === 'driver')
        
        // Show success message
        setToastMessage(`Ahora eres ${newRole === 'driver' ? 'conductor' : 'pasajero'}`)
        setToastType('success')
        setToastVisible(true)
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el rol. Intenta de nuevo.')
      console.error('Error switching role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    console.log('handleLogout called')
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de cerrar sesión?',
      [
        { 
          text: 'Cancelar', 
          onPress: () => {
            console.log('Logout cancelled')
            setShouldLogout(false)
          },
          style: 'cancel' 
        },
        {
          text: 'Cerrar',
          onPress: () => {
            console.log('Cerrar pressed - setting shouldLogout to true')
            setShouldLogout(true)
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    )
  }

  const performLogout = async () => {
    try {
      setToastMessage('Cerrando sesión...')
      setToastVisible(true)

      // Hacer logout en Supabase primero
      await logoutAuth()

      // Limpiar el store
      logoutStore()

      // Mostrar toast de éxito antes de que AppNavigator cambie
      setToastMessage('Sesión cerrada correctamente')
      setToastType('success')
      setToastVisible(true)
    } catch (error: any) {
      // Limpiar el store de todas formas
      logoutStore()

      setToastMessage('Sesión cerrada')
      setToastType('success')
      setToastVisible(true)
    }
  }

  const handleProfilePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0] && user?.id) {
        setUploadingPhoto(true)
        const photoUrl = await uploadProfilePhoto(user.id, result.assets[0].uri)
        
        // Refresh profile
        await fetchProfile(user.id)
        
        setToastMessage('Foto de perfil actualizada')
        setToastType('success')
        setToastVisible(true)
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      setToastMessage(error.message || 'Error al subir la foto')
      setToastType('error')
      setToastVisible(true)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleVehiclePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0] && user?.id) {
        setUploadingVehiclePhoto(true)
        try {
          const photoUrl = await uploadVehiclePhoto(user.id, null, result.assets[0].uri)
          console.log('Received vehicle photo URL:', photoUrl)
          setVehiclePhotoUrl(photoUrl)
          
          setToastMessage('Foto del vehículo actualizada')
          setToastType('success')
          setToastVisible(true)
        } finally {
          setUploadingVehiclePhoto(false)
        }
      }
    } catch (error: any) {
      console.error('Error uploading vehicle photo:', error)
      setToastMessage(error.message || 'Error al subir la foto')
      setToastType('error')
      setToastVisible(true)
    } finally {
      setUploadingVehiclePhoto(false)
    }
  }

  const showPhotoOptions = () => {
    Alert.alert(
      'Foto de Perfil',
      '¿Qué deseas hacer?',
      [
        {
          text: 'Cambiar foto',
          onPress: handleProfilePhotoUpload,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    )
  }

  const showVehiclePhotoOptions = () => {
    Alert.alert(
      'Foto del Vehículo',
      '¿Qué deseas hacer?',
      [
        {
          text: 'Cargar foto',
          onPress: handleVehiclePhotoUpload,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
        <TouchableOpacity 
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings' as never)}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerContent}>
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={showPhotoOptions}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (user?.avatar_url || profile?.avatar_url) ? (
              <>
                <Image 
                  source={{ uri: user?.avatar_url || profile?.avatar_url }}
                  style={styles.avatarImage}
                />
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={16} color={COLORS.textInverse} />
                </View>
              </>
            ) : (
              <>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={16} color={COLORS.textInverse} />
                </View>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Usuario'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={COLORS.accent} />
              <Text style={styles.ratingText}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.ratingLabel}>({profile?.total_trips || 0} viajes)</Text>
            </View>
          </View>
        </View>

        <View style={styles.modeSelectorContainer}>
          <Text style={styles.modeSelectorLabel}>Mi Rol</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeBtn, !isDriver ? styles.modeBtnActive : styles.modeBtnInactive]}
              onPress={() => handleRoleSwitch('passenger')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Ionicons
                name={!isDriver ? 'person' : 'person-outline'}
                size={22}
                color={!isDriver ? COLORS.textInverse : COLORS.textSecondary}
              />
              <Text style={[styles.modeBtnText, !isDriver && styles.modeBtnTextActive]}>
                Pasajero
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, isDriver ? styles.modeBtnActive : styles.modeBtnInactive]}
              onPress={() => handleRoleSwitch('driver')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isDriver ? 'car' : 'car-outline'}
                size={22}
                color={isDriver ? COLORS.textInverse : COLORS.textSecondary}
              />
              <Text style={[styles.modeBtnText, isDriver && styles.modeBtnTextActive]}>
                Conductor
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !isDriver ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Actividad</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="car-outline" size={24} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
              <Text style={styles.statLabel}>Viajes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.statValue}>${(profile?.total_spent || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</Text>
              <Text style={styles.statLabel}>Gastado</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Pasajero</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuIcon}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Mis direcciones</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuCard}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuIcon}>
                <Ionicons name="card-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Métodos de pago</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Notificaciones</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => navigation.navigate('Security' as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Seguridad</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.driverCta}
            onPress={() => handleRoleSwitch('driver')}
          >
            <View style={styles.driverCtaContent}>
              <View style={styles.driverCtaIcon}>
                <Ionicons name="car-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.driverCtaText}>
                <Text style={styles.driverCtaTitle}>Conviértete en conductor</Text>
                <Text style={styles.driverCtaSubtitle}>Empieza a ganar dinero ahora</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.vehiclePhotoContainer}
            onPress={showVehiclePhotoOptions}
            disabled={uploadingVehiclePhoto}
            activeOpacity={0.8}
          >
            {uploadingVehiclePhoto ? (
              <View style={styles.vehiclePhotoLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : vehiclePhotoUrl ? (
              <>
                <Image 
                  source={{ uri: vehiclePhotoUrl }}
                  style={styles.vehiclePhotoImage}
                  onError={(error) => {
                    console.error('Vehicle photo load error:', error)
                    setVehiclePhotoError(true)
                  }}
                  onLoad={() => {
                    console.log('Vehicle photo loaded:', vehiclePhotoUrl)
                    setVehiclePhotoError(false)
                  }}
                />
                {vehiclePhotoError && (
                  <View style={styles.vehiclePhotoError}>
                    <Ionicons name="warning" size={32} color={COLORS.error} />
                    <Text style={styles.vehiclePhotoErrorText}>No se pudo cargar</Text>
                  </View>
                )}
                <View style={styles.vehiclePhotoBadge}>
                  <Ionicons name="camera" size={24} color={COLORS.textInverse} />
                </View>
              </>
            ) : (
              <View style={styles.vehiclePhotoEmpty}>
                <Ionicons name="car" size={56} color={COLORS.primary} />
                <Text style={styles.vehiclePhotoEmptyText}>Cargar foto del vehículo</Text>
                <Text style={styles.vehiclePhotoEmptySubtext}>Toca para seleccionar</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Conductor</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('VehicleInfo' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="car-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Mi vehículo</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('DriverDocuments' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Documentos</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Earnings' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Ganancias</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => navigation.navigate('Stats' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Estadísticas</Text>
              <Ionicons name="chevron-forward" size={20} style={styles.menuChevron} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('DriverRegister' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={22} color={COLORS.textInverse} />
            <Text style={styles.registerBtnText}>Crear Nueva Ruta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.panelBtn}
            onPress={() => navigation.navigate('DriverPanel' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="speedometer" size={22} color={COLORS.primary} />
            <Text style={styles.panelBtnText}>Panel del Conductor</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {profile?.role === 'support' && (
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => navigation.navigate('AdminDocuments' as never)}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={styles.adminBtnText}>Verificar Documentos</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onHide={() => setToastVisible(false)}
      />
    </ScrollView>
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
    backgroundColor: COLORS.background,
    paddingBottom: 100,
  },
  
  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  
  // Profile Card
  headerContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
    ...SHADOWS.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  profileEmail: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  ratingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  ratingLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  
  // Mode Selector
  modeSelectorContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  modeSelectorLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  modeBtnInactive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderLight,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  modeBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: COLORS.textInverse,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  
  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  
  // Menu Card
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.lg,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  menuChevron: {
    color: COLORS.textTertiary,
  },
  
  // CTA
  driverCta: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
    ...SHADOWS.sm,
  },
  driverCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    flex: 1,
  },
  driverCtaIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverCtaText: {
    gap: SPACING.xs,
    flex: 1,
  },
  driverCtaTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  driverCtaSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  
  // Vehicle Photo Container
  vehiclePhotoContainer: {
    width: '100%',
    height: 280,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
    position: 'relative',
  },
  vehiclePhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vehiclePhotoLoading: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  vehiclePhotoEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    gap: SPACING.md,
  },
  vehiclePhotoEmptyText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  vehiclePhotoEmptySubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  vehiclePhotoError: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    gap: SPACING.md,
  },
  vehiclePhotoErrorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
  },
  vehiclePhotoBadge: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  
  // Old Vehicle Card (backup)
  vehicleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  vehicleImage: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  vehicleImageContent: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
  },
  vehicleImageText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  vehicleEditBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
    ...SHADOWS.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  vehicleSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  
  // Badge
  pendingBadge: {
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  pendingText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.warning,
  },
  
  // Buttons
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  registerBtnText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  panelBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    ...SHADOWS.sm,
  },
  panelBtnText: {
    flex: 1,
    color: COLORS.primary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },

  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  adminBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  logoutText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.error,
    fontWeight: '600',
  },
})
