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
  const [transportType, setTransportType] = useState<'all' | 'auto' | 'taxi' | 'busetica' | 'buseta'>('auto')
  const [destination, setDestination] = useState('')
  const [topRoutes, setTopRoutes] = useState<Route[]>([])
  const [isFetchingTopRoutes, setIsFetchingTopRoutes] = useState(false)
  const [animationType, setAnimationType] = useState<'car' | 'map'>('car')
  
  // Estado del progreso del viaje real
  const [tripProgress, setTripProgress] = useState<number>(0)
  const [locationStatus, setLocationStatus] = useState<string>('')
  const [hasActiveTrip, setHasActiveTrip] = useState<boolean>(false)
  
  // Obtener ubicación del usuario
  const { location: userLocation, loading: locationLoading, error: locationError } = useUserLocation(5)
  
  // Animación del carro
  const carPositionAnim = useRef(new Animated.Value(0)).current
  const realTripProgressAnim = useRef(new Animated.Value(0)).current
  const mapOpacityAnim = useRef(new Animated.Value(0)).current
  
  // Iniciar animación DEMO (cuando no hay viaje activo)
  useEffect(() => {
    if (hasActiveTrip) {
      // Si hay viaje activo, no usar demo
      return
    }
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(carPositionAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(carPositionAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [carPositionAnim, hasActiveTrip])
  
  // Cambiar tipo de animación DEMO cada 6 segundos (solo si no hay viaje activo)
  useEffect(() => {
    if (hasActiveTrip) {
      return // No alternar si hay viaje activo
    }
    
    const interval = setInterval(() => {
      setAnimationType(prev => prev === 'car' ? 'map' : 'car')
    }, 6000)
    return () => clearInterval(interval)
  }, [hasActiveTrip])
  
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
    
    // Si no hay viaje o no tenemos coords, usar DEMO con animación visual
    if (!selectedRoute || !progress) {
      setHasActiveTrip(false)
      // Simular progreso con animación: 0% → 100% → 0%
      const demoProgress = Animated.loop(
        Animated.sequence([
          Animated.timing(new Animated.Value(0), {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      )
      return
    }
    
    // Actualizar progreso si hay viaje activo
    if (progress) {
      setTripProgress(progress.progressPercent)
      setLocationStatus(status)
      
      Animated.timing(realTripProgressAnim, {
        toValue: progress.progressPercent / 100,
        duration: 1000,
        useNativeDriver: false,
      }).start()
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
      const routes = await fetchRoutes(undefined, undefined, transportType, 'driver_rating', false, 4)
      setTopRoutes(routes)
    } catch (err) {
      console.warn('Error cargando rutas destacadas:', err)
    } finally {
      setIsFetchingTopRoutes(false)
    }
  }, [fetchRoutes, transportType])

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

        {/* Balance / Earnings Card */}
        <View
          style={[styles.balanceCard, { backgroundColor: '#E8F1FF' }]}
        >
          {/* Card Content - Compact Layout */}
          <View style={{ padding: SPACING.md, paddingVertical: SPACING.md }}>
            {/* Header Row: Greeting + Notification Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
                  <Text style={[styles.greeting, { color: '#1a1a1a', fontSize: 13 }]}>
                    {getGreeting()},
                  </Text>
                  <Text style={{ 
                    fontSize: 15, 
                    fontWeight: '700', 
                    color: COLORS.primary,
                    marginLeft: 4
                  }}>
                    {user?.name ? user.name.split(' ')[0] : ''}
                  </Text>
                </View>
                
                {/* Role - Large & Prominent */}
                <Text style={{ 
                  fontSize: 28, 
                  fontWeight: '800', 
                  color: '#F5F5F5',
                  lineHeight: 32
                }}>
                  {isDriver ? 'Conductor' : 'Pasajero'}
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
                    top: -4,
                    right: -4,
                    backgroundColor: COLORS.error,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                      {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Transport Visualization + Amount Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              
              {/* Left: Transport Animation - Expanded Horizontally */}
              <View style={{
                width: 240,
                height: 90,
                backgroundColor: 'rgba(21, 74, 168, 0.08)',
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* ANIMACIÓN PRINCIPAL: LÍNEA HORIZONTAL CON PROGRESO */}
                <>
                  {/* Línea de progreso completa (background) */}
                  <View style={{
                    position: 'absolute',
                    width: '90%',
                    height: 3,
                    backgroundColor: '#E0E0E0',
                    borderRadius: 1.5,
                    left: '5%',
                  }} />
                  
                  {/* Línea de progreso real (foreground) */}
                  <Animated.View
                    style={{
                      position: 'absolute',
                      height: 3,
                      backgroundColor: hasActiveTrip ? '#10B981' : '#3B82F6',
                      borderRadius: 1.5,
                      left: '5%',
                      width: realTripProgressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '90%'],
                      }),
                    }}
                  />
                  
                  {/* Punto origen - Verde */}
                  <View style={{
                    position: 'absolute',
                    left: '5%',
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#10B981',
                    borderWidth: 3,
                    borderColor: '#fff',
                    zIndex: 2,
                  }} />
                  
                  {/* Punto destino - Rojo */}
                  <View style={{
                    position: 'absolute',
                    right: '5%',
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#EF4444',
                    borderWidth: 3,
                    borderColor: '#fff',
                    zIndex: 2,
                  }} />
                  
                  {/* Carro animado según progreso */}
                  <Animated.View
                    style={{
                      position: 'absolute',
                      zIndex: 3,
                      transform: [
                        {
                          translateX: realTripProgressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [6, 220],
                          }),
                        },
                        {
                          translateY: 0,
                        },
                      ],
                    }}
                  >
                    <Ionicons name="car-sport" size={24} color={hasActiveTrip ? '#154AA8' : '#3B82F6'} />
                  </Animated.View>
                  
                  {/* Información de progreso en la parte inferior */}
                  <Text style={{
                    position: 'absolute',
                    bottom: 8,
                    fontSize: 11,
                    fontWeight: '600',
                    color: hasActiveTrip ? '#154AA8' : '#666',
                    backgroundColor: hasActiveTrip ? '#E8F1FF' : '#F0F0F0',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}>
                    {hasActiveTrip ? `${tripProgress.toFixed(0)}%` : 'Demo'}
                  </Text>
                </>
                {/* Fin animación principal */}
              </View>
              
              {/* Right: Amount & Subtitle */}
              <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: SPACING.md }}>
                <Text style={{ 
                  fontSize: 22, 
                  fontWeight: '800', 
                  color: '#1a1a1a',
                  letterSpacing: -0.5
                }}>
                  ${(isDriver ? user?.earnings ?? 0 : user?.spent ?? 0).toLocaleString('es-CO')}
                </Text>
                <Text style={{ 
                  fontSize: 10, 
                  fontWeight: '400', 
                  color: '#1a1a1a' + '75',
                  marginTop: 1
                }}>
                  {isDriver ? 'Ganancias' : 'Gastado'}
                </Text>
              </View>
            </View>
            
            {/* Location Status - Si hay viaje activo */}
            {hasActiveTrip && locationStatus && (
              <View style={{ marginTop: 12, paddingHorizontal: 0 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#154AA8',
                  textAlign: 'center',
                  backgroundColor: '#E8F1FF',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                }}>
                  📍 {locationStatus}
                </Text>
              </View>
            )}
            
            {/* TRIVE Chip - Bottom Left */}
            <View style={[styles.balanceChip, { backgroundColor: COLORS.primary, alignSelf: 'flex-start' }]}>
              <Text style={[styles.balanceChipText, { color: COLORS.textInverse }]}>TRIVE</Text>
            </View>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>¿A dónde vas?</Text>

          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchPoints}>
                <View style={styles.pointDotBlue} />
                <View style={styles.pointLine} />
              </View>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>Desde</Text>
                <View style={styles.searchValueRow}>
                  <Ionicons name="locate" size={14} color={COLORS.primary} />
                  <Text style={styles.searchValue} numberOfLines={1}>Mi ubicación actual</Text>
                </View>
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
            style={[styles.searchBtn, !destination && styles.searchBtnDisabled]}
            disabled={!destination}
            onPress={() =>
              navigation.navigate(
                'Main' as never,
                { screen: 'Search', params: { transportType, destination: destination.trim() } } as never,
              )
            }
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color={destination ? COLORS.textInverse : COLORS.textSecondary} />
            <Text style={[styles.searchBtnText, !destination && styles.searchBtnTextDisabled]}>
              Buscar rutas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transport Type Selector */}
        <View style={styles.transportSection}>
          <Text style={styles.sectionTitle}>Tipo de transporte</Text>
          <View style={styles.transportRow}>
            {(['all', 'auto', 'taxi', 'busetica', 'buseta'] as const).map((type) => {
              const isActive = transportType === type
              const icons: Record<string, string> = {
                all: 'apps',
                auto: 'car',
                taxi: 'car-outline',
                busetica: 'bus-outline',
                buseta: 'bus',
              }
              const labels: Record<string, string> = {
                all: 'Todos',
                auto: 'Auto',
                taxi: 'Taxi',
                busetica: 'Busetica',
                buseta: 'Buseta',
              }

              return (
                <Pressable
                  key={type}
                  style={[styles.transportItem, isActive && styles.transportItemActive]}
                  onPress={() => setTransportType(type)}
                >
                  <View style={[styles.transportIcon, isActive && styles.transportIconActive]}>
                    <Ionicons
                      name={icons[type] as any}
                      size={18}
                      color={(() => {
                        if (type === 'taxi') return '#FFD700';
                        if (type === 'auto' || type === 'busetica' || type === 'buseta') return '#154AA8';
                        return '#154AA8';
                      })()}
                    />
                  </View>
                  <Text style={[styles.transportLabel, isActive && styles.transportLabelActive]} numberOfLines={1}>
                    {labels[type]}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('ScheduledTrips' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'transparent' }]}> 
              <Ionicons name="calendar-outline" size={18} color="#154AA8" />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Mis viajes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('GroupTrips' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'transparent' }]}>
              <Ionicons name="people-outline" size={18} color="#154AA8" />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Grupal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('FavoriteRoutes' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'transparent' }]}>
              <Ionicons name="heart-outline" size={18} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('TripHistory' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'transparent' }]}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Chat' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'transparent' }]}> 
              <Ionicons name="chatbubble-outline" size={18} color="#154AA8" />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Mensajes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Rutas destacadas</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  'Main' as never,
                  { screen: 'Search', params: { transportType: 'all' } } as never,
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
                    { screen: 'Search', params: { transportType } } as never,
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
    backgroundColor: COLORS.accent,
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
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  searchBtnDisabled: {
    backgroundColor: COLORS.surfaceAlt,
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
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transportItem: {
    flex: 1,
    minWidth: 60,
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#154AA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  transportItemActive: {
    backgroundColor: '#E8F1FF',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  transportIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  transportIconActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  transportLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  transportLabelActive: {
    color: '#1a1a1a',
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
})
