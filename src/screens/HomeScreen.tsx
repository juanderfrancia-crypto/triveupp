import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useNotifications } from '../hooks/useNotifications'
import { useFocusEffect } from '@react-navigation/native'
import { useUserLocation } from '../hooks/useUserLocation'
import {
  calculateTripProgress,
  getTripStatusMessage,
  getCoordinatesFromLocationName,
  getNearestLocation,
} from '../utils/tripProgress'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [topRoutes, setTopRoutes] = useState<Route[]>([])
  const [isFetchingTopRoutes, setIsFetchingTopRoutes] = useState(false)
  
  // Estado del progreso del viaje real
  const [tripProgress, setTripProgress] = useState<number>(0)
  const [locationStatus, setLocationStatus] = useState<string>('')
  const [hasActiveTrip, setHasActiveTrip] = useState<boolean>(false)
  
  // Obtener ubicación del usuario
  const { location: userLocation, loading: locationLoading, error: locationError } = useUserLocation(5)
  
  // Animación del carro
  const carPositionAnim = useRef(new Animated.Value(0)).current
  const realTripProgressAnim = useRef(new Animated.Value(0)).current
  

  
  // Calcular progreso real del viaje si hay viaje activo, o demo
  useEffect(() => {
    if (!userLocation) {
      return
    }
    
    let progress
    let status
    
    // Si hay viaje activo, usar coordenadas reales
    if (selectedRoute) {
      const originCoords = getCoordinatesFromLocationName(selectedRoute.origin)
      const destCoords = getCoordinatesFromLocationName(selectedRoute.destination)
      
      if (originCoords && destCoords) {
        progress = calculateTripProgress(
          userLocation.latitude,
          userLocation.longitude,
          originCoords.latitude,
          originCoords.longitude,
          destCoords.latitude,
          destCoords.longitude
        )
        status = getTripStatusMessage(
          userLocation.latitude,
          userLocation.longitude,
          selectedRoute.origin,
          selectedRoute.destination,
          progress
        )
        setHasActiveTrip(true)
      } else {
        // Fallback si no tenemos coords
        setHasActiveTrip(false)
      }
    }
    
    // Si no hay viaje o no tenemos coords, limpiar
    if (!selectedRoute || !progress) {
      setHasActiveTrip(false)
      return
    }
    
    // Actualizar dinero y estado del viaje si hay ruta activa
    if (progress) {
      setTripProgress(progress.progressPercent)
      setLocationStatus(status)
      setHasActiveTrip(true)
    }
  }, [userLocation, realTripProgressAnim, selectedRoute])
  
  const balance = useAppStore((state) => state.balance)
  const user = useAppStore((state) => state.user)
  const selectedRoute = useAppStore((state) => state.selectedRoute)
  const { loading: routesLoading, error: routesError, fetchRoutes } = useRoutes()
  useNotifications(user?.id)
  const notificationUnreadCount = useAppStore((state) => state.notificationUnreadCount)
  const showRoutesLoading = (isFetchingTopRoutes || routesLoading) && topRoutes.length === 0
  const showRoutesError = routesError && topRoutes.length === 0
  const isDriver = user?.role === 'driver'

  const loadTopDrivers = useCallback(async () => {
    setIsFetchingTopRoutes(true)
    setTopRoutes([])
    try {
      const routes = await fetchRoutes(undefined, undefined, 'all', 'driver_rating', false, 4)
      setTopRoutes(routes)
    } catch (err) {
      console.warn('Error cargando rutas destacadas:', err)
    } finally {
      setIsFetchingTopRoutes(false)
    }
  }, [fetchRoutes])

  useFocusEffect(
    useCallback(() => {
      loadTopDrivers()
    }, [loadTopDrivers])
  )

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Fondo blanco puro */}
      <View style={styles.gradientBg}>
        <View style={styles.backgroundGradient} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header - Empty Space */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
        </View>

        {/* Balance / Earnings Card - REDISEÑADA */}
        <View
          style={[styles.balanceCard, { backgroundColor: '#E8F1FF' }]}
        >
          <View style={{ padding: SPACING.lg }}>
            {/* Header Row: Greeting + Notification Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greeting, { color: '#1a1a1a', fontSize: 26, fontWeight: '600', lineHeight: 32 }]}>
                  {getGreeting()}, <Text style={{ fontWeight: '800', color: COLORS.primary }}>
                    {user?.name ? user.name.split(' ')[0] : 'Usuario'}
                  </Text>
                </Text>
              </View>
              
              {/* Notification Button - Black Background */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#1a1a1a',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 8,
                }}
                onPress={() => navigation.navigate('Notifications' as never)}
                activeOpacity={0.85}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {notificationUnreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    backgroundColor: COLORS.error,
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                      {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Main Amount - PROTAGONIST */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ 
                fontSize: 32, 
                fontWeight: '800', 
                color: COLORS.primary,
                letterSpacing: -0.8
              }}>
                ${(isDriver ? user?.earnings ?? 0 : user?.spent ?? 0).toLocaleString('es-CO')}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: '500', 
                color: '#1a1a1a' + '75',
                marginTop: 2
              }}>
                {isDriver ? 'Ganancias hoy' : 'Gastado este mes'}
              </Text>
            </View>

            {/* Status Pills - Conductor */}
            {isDriver && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <View style={{
                  backgroundColor: 'rgba(21, 74, 168, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Ionicons name="car" size={14} color={COLORS.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>
                    4 viajes
                  </Text>
                </View>
                
                <View style={{
                  backgroundColor: 'rgba(250, 204, 21, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3
                }}>
                  <Ionicons name="star" size={14} color="#FACC15" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>
                    4.8
                  </Text>
                </View>
                
                <View style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46' }}>
                    En línea
                  </Text>
                </View>
              </View>
            )}

            {/* Status Pills - Pasajero */}
            {!isDriver && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <View style={{
                  backgroundColor: 'rgba(21, 74, 168, 0.1)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Ionicons name="calendar" size={14} color={COLORS.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>
                    Próx: 22:30
                  </Text>
                </View>
                
                {/* Membership Badge */}
                {(() => {
                  const membershipType = user?.membership_type || 'free'
                  const membershipExpiry = user?.membership_expiry ? new Date(user.membership_expiry) : null
                  const today = new Date()
                  const daysRemaining = membershipExpiry && membershipExpiry > today 
                    ? Math.ceil((membershipExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : 0

                  // Colores según tipo de membresía
                  const membershipColors: Record<string, { bg: string; text: string; icon: string }> = {
                    free: { bg: 'rgba(107, 114, 128, 0.1)', text: '#374151', icon: 'shield-outline' },
                    basic: { bg: 'rgba(59, 130, 246, 0.1)', text: '#1E40AF', icon: 'shield-checkmark' },
                    premium: { bg: 'rgba(168, 85, 247, 0.1)', text: '#6B21A8', icon: 'star' },
                    vip: { bg: 'rgba(217, 70, 39, 0.1)', text: '#7C2D12', icon: 'crown' },
                  }

                  const colors = membershipColors[membershipType] || membershipColors.free
                  const displayText = membershipType === 'free' 
                    ? 'Gratis'
                    : membershipType === 'basic'
                    ? 'Básico'
                    : membershipType === 'premium'
                    ? 'Premium'
                    : 'VIP'

                  const displaySubtext = daysRemaining > 0 
                    ? `${daysRemaining} días`
                    : membershipExpiry
                    ? 'Expirado'
                    : ''

                  return (
                    <View style={{
                      backgroundColor: colors.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Ionicons name={colors.icon as any} size={14} color={colors.text} />
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                          {displayText}
                        </Text>
                        {displaySubtext && (
                          <Text style={{ fontSize: 10, color: colors.text, opacity: 0.7 }}>
                            {displaySubtext}
                          </Text>
                        )}
                      </View>
                    </View>
                  )
                })()}
                
                {/* Saldo Badge */}
                {(() => {
                  const balance = user?.balance || 0
                  const formattedBalance = balance >= 1000 
                    ? `$${(balance / 1000).toFixed(1)}k`
                    : `$${balance}`
                  
                  let balanceColor = '#22C55E' // Green (healthy)
                  let balanceTextColor = '#15803D'
                  
                  if (balance < 10000) {
                    balanceColor = '#EAB308' // Yellow (low)
                    balanceTextColor = '#713F12'
                  }
                  if (balance < 5000) {
                    balanceColor = '#EF4444' // Red (warning)
                    balanceTextColor = '#7F1D1D'
                  }

                  return (
                    <View style={{
                      backgroundColor: balanceColor === '#22C55E' ? 'rgba(34, 197, 94, 0.1)' : balanceColor === '#EAB308' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Ionicons name="wallet" size={14} color={balanceColor} />
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: balanceTextColor }}>
                          Saldo: {formattedBalance}
                        </Text>
                      </View>
                    </View>
                  )
                })()}
              </View>
            )}

            {/* TRIVE Chip - Bottom */}
            <View style={[styles.balanceChip, { backgroundColor: COLORS.primary, alignSelf: 'flex-start', marginTop: 12 }]}>
              <Text style={[styles.balanceChipText, { color: COLORS.textInverse }]}>TRIVE</Text>
            </View>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Buscar viaje</Text>

          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchPoints}>
                <View style={styles.pointDotBlue} />
                <View style={styles.pointLine} />
              </View>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>Desde</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ej: Armenia, Cali..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={origin}
                  onChangeText={setOrigin}
                />
              </View>
            </View>

            <View style={styles.searchRowTo}>
              <View style={styles.searchPointsTo}>
                <View style={styles.pointDotOrange} />
              </View>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>Hacia</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ej: Cali, Puerto Tejada..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={destination}
                  onChangeText={setDestination}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.searchBtn, !destination || !origin && styles.searchBtnDisabled]}
            disabled={!destination || !origin}
            onPress={() =>
              navigation.navigate(
                'Main' as never,
                { screen: 'Search', params: { origin: origin.trim(), destination: destination.trim() } } as never,
              )
            }
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color={destination && origin ? COLORS.textInverse : COLORS.textSecondary} />
            <Text style={[styles.searchBtnText, !destination || !origin && styles.searchBtnTextDisabled]}>
              Buscar rutas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Available Rides NOW Button */}
        <TouchableOpacity
          style={styles.availableRidesButton}
          onPress={() => navigation.navigate('AvailableRides' as never)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10A37F', '#0E8B6E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.availableRidesGradient}
          >
            <View style={styles.availableRidesContent}>
              <View style={styles.availableRidesIcon}>
                <Ionicons name="flash" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.availableRidesText}>
                <Text style={styles.availableRidesLabel}>Viajes Ahora</Text>
                <Text style={styles.availableRidesSubtitle}>Ver disponibles en tiempo real</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Routes Section */}
        <View style={styles.routesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Rutas destacadas</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  'Main' as never,
                  { screen: 'Search' } as never,
                )
              }
              activeOpacity={0.8}
            >
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {showRoutesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando mejores rutas...</Text>
            </View>
          ) : showRoutesError ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionTitle}>No se pudieron cargar las rutas</Text>
              <Text style={styles.emptySectionText}>{routesError}</Text>
            </View>
          ) : topRoutes.length > 0 ? (
            topRoutes.map((route: Route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.homeRouteCardWrapper}
                activeOpacity={0.88}
                onPress={() =>
                  navigation.navigate(
                    'Main' as never,
                    { screen: 'Search' } as never,
                  )
                }
              >
                <LinearGradient
                  colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1.2, y: 1.2 }}
                  style={styles.homeRouteCardGradient}
                >
                  <View style={styles.homeRouteTop}>
                    <View style={styles.homeRouteRouteContainer}>
                      <View style={styles.homeRouteDotOrigin} />
                      <View style={styles.homeRouteTextContainer}>
                        <Text style={styles.homeRouteText} numberOfLines={1}>
                          {route.origin}
                        </Text>
                        <Text style={styles.homeRouteTextSecondary} numberOfLines={1}>
                          → {route.destination}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.homeSeatsAvailable}>
                      <Text style={styles.homeSeatsText}>{route.available_seats} puesto{route.available_seats === 1 ? '' : 's'}</Text>
                    </View>
                  </View>

                  <View style={styles.homeRouteMiddle}>
                    <View style={styles.homeRouteDetailItem}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.textInverse} />
                      <Text style={styles.homeRouteDetailText}>
                        {new Date(route.departure_time).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={styles.homeRouteDetailItem}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.textInverse} />
                      <Text style={styles.homeRouteDetailText}>
                        ${route.price_per_seat.toLocaleString('es-CO')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.homeRouteDivider} />

                  <View style={styles.homeRouteBottom}>
                    <View style={styles.homeRouteDriver}>
                      <View style={styles.homeDriverAvatar}>
                        <Text style={styles.homeDriverInitials}>
                          {route.driver_name
                            ? route.driver_name
                                .split(' ')
                                .map((name) => name[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : 'DR'}
                        </Text>
                      </View>
                      <View style={styles.homeDriverDetails}>
                        <Text style={styles.homeDriverName} numberOfLines={1}>
                          {route.driver_name || 'Conductor mejor calificado'}
                        </Text>
                        <View style={styles.homeRatingBadge}>
                          <Ionicons name="star" size={12} color={COLORS.accent} />
                          <Text style={styles.homeRatingText}>{route.driver_rating?.toFixed(1) ?? '0.0'}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.homeSeatsAvailable}>
                      <Text style={styles.homeSeatsText}>
                        {route.vehicle_type ? route.vehicle_type.charAt(0).toUpperCase() + route.vehicle_type.slice(1) : 'Transporte'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionTitle}>No hay rutas disponibles</Text>
              <Text style={styles.emptySectionText}>
                Cambia el tipo de transporte o espera que nuevos viajes se publiquen.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Fondo con círculos decorativos 3D
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerSpacer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  // Balance Card
  // Balance Card
  balanceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8F1FF',
    borderWidth: 0,
    shadowColor: '#154AA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a' + '85',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -1,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: 12,
  },
  balanceChip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textInverse,
    letterSpacing: 1,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  searchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchRowTo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  searchPoints: {
    alignItems: 'center',
    marginRight: 12,
  },
  searchPointsTo: {
    marginRight: 12,
    marginTop: 6,
  },
  pointDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  pointDotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  pointLine: {
    width: 2,
    height: 26,
    backgroundColor: COLORS.borderLight,
    marginTop: 4,
    marginLeft: 4,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  searchValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  searchInput: {
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 0,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  searchBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  searchBtnTextDisabled: {
    color: COLORS.textSecondary,
  },

  // Transport Section
  transportSection: {
    marginBottom: SPACING.xl,
  },
  transportRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transportItem: {
    flex: 1,
    minWidth: 56,
    maxWidth: '18.5%',
    backgroundColor: '#F0F4FA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: 'rgba(21, 74, 168, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  transportItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  transportItemGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    width: '100%',
  },
  transportIcon: {
    marginBottom: 4,
  },
  transportIconInner: {
    marginBottom: 4,
  },
  transportIconInactive: {
    marginBottom: 4,
  },
  transportLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 11,
  },
  transportLabelActive: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 11,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: 10,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: '#E8F1FF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#154AA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },

  // Routes Section
  routesSection: {
    paddingHorizontal: SPACING.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptySection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptySectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySectionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  // Route Card
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  routeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeLeft: {
    flex: 1,
    marginRight: 12,
  },
  routeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  routeOrigin: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  routeTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginLeft: 14,
  },
  routeRight: {
    alignItems: 'flex-end',
  },
  routePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  routePricePer: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  routeDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  routeBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  routeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  routeDriver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '50',
  },
  driverInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  driverInfo: {
    marginRight: 2,
  },
  driverName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  seatsBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Home Route Cards - Gradient Style
  homeRouteCardWrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryDark,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF' + '15',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  homeRouteCardGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  homeRouteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  homeRouteRouteContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 0,
  },
  homeRouteTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  homeRouteDotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginTop: 3,
  },
  homeRouteText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '700',
    flexShrink: 1,
  },
  homeRouteTextSecondary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textInverse + 'DD',
    marginTop: 2,
    flexShrink: 1,
  },
  homeRoutePriceBox: {
    marginLeft: SPACING.md,
  },
  homeRoutePrice: {
    ...TYPOGRAPHY.h4,
    color: '#fff',
    fontWeight: '700',
  },
  homeRouteMiddle: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  homeRouteDetailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  homeRouteDetailText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  homeRouteDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: SPACING.sm,
  },
  homeRouteBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeRouteDriver: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  homeDriverAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeDriverInitials: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  homeDriverDetails: {
    flex: 1,
  },
  homeDriverName: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  homeRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  homeRatingText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
    fontSize: 10,
  },
  homeSeatsAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  homeSeatsText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
    fontSize: 12,
  },

  // Available Rides Button
  availableRidesButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#10A37F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  availableRidesGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  availableRidesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  availableRidesIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableRidesText: {
    flex: 1,
  },
  availableRidesLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  availableRidesSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
})
