import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useNotifications } from '../hooks/useNotifications'
import { useFocusEffect } from '@react-navigation/native'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const [transportType, setTransportType] = useState<'auto' | 'taxi' | 'busetica' | 'buseta'>('auto')
  const [destination, setDestination] = useState('')
  const [topRoutes, setTopRoutes] = useState<Route[]>([])
  const [isFetchingTopRoutes, setIsFetchingTopRoutes] = useState(false)
  const balance = useAppStore((state) => state.balance)
  const setBalance = useAppStore((state) => state.setBalance)
  const user = useAppStore((state) => state.user)
  const { loading: routesLoading, error: routesError, fetchRoutes } = useRoutes()
  useNotifications(user?.id)
  const notificationUnreadCount = useAppStore((state) => state.notificationUnreadCount)
  const showRoutesLoading = (isFetchingTopRoutes || routesLoading) && topRoutes.length === 0
  const showRoutesError = routesError && topRoutes.length === 0

  const handleAddCredit = () => {
    setBalance(balance + 10000)
  }

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
      {/* Fondo con círculos decorativos 3D */}
      <View style={styles.gradientBg}>
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

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.logo}>Trive</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
            {notificationUnreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <Pressable
          style={({ pressed }) => [
            styles.balanceCard,
            pressed && styles.balanceCardPressed,
          ]}
          onPress={handleAddCredit}
        >
          <View style={styles.balanceCardBg} />
          <View style={styles.balanceContent}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>Saldo disponible</Text>
              <Text style={styles.balanceAmount}>${balance.toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.addBalanceBtn}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </View>
          </View>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceChip}>
              <Text style={styles.balanceChipText}>TRIVE</Text>
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceCardNumber}>•••• •••• •••• 4523</Text>
              <View style={styles.balanceVerified}>
                <Ionicons name="checkmark-circle" size={11} color={COLORS.textInverse} />
                <Text style={styles.balanceVerifiedText}>Verificado</Text>
              </View>
            </View>
          </View>
        </Pressable>

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
                { screen: 'Search', params: { transportType } } as never,
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
                      color={isActive ? COLORS.textInverse : COLORS.primary}
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
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '20' }]}> 
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Mis viajes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('GroupTrips' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="people-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Grupal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('FavoriteRoutes' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="heart-outline" size={18} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('TripHistory' as never)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Historial</Text>
          </TouchableOpacity>
        </View>

        {/* Routes Section */}
        <View style={styles.routesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Rutas disponibles</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  'Main' as never,
                  { screen: 'Search', params: { transportType: 'all' } } as never,
                )
              }
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
                  colors={[COLORS.primary, COLORS.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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
                      <Ionicons name="calendar-outline" size={14} color="#fff" />
                      <Text style={styles.homeRouteDetailText}>
                        {new Date(route.departure_time).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={styles.homeRouteDetailItem}>
                      <Ionicons name="cash-outline" size={14} color="#fff" />
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
  gradientCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  gradientCircle1: {
    top: -80,
    right: -60,
    width: 280,
    height: 280,
  },
  gradientCircle2: {
    top: 200,
    left: -120,
    width: 360,
    height: 360,
  },
  gradientCircle3: {
    top: 480,
    right: -80,
    width: 240,
    height: 240,
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
  greeting: {
    fontSize: 13,
    fontWeight: '500',
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
  balanceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  balanceCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.2,
  },
  balanceCardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingTop: 24,
  },
  balanceLeft: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textInverse + '85',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textInverse,
    letterSpacing: -1,
  },
  addBalanceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: 12,
  },
  balanceChip: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  balanceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceCardNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textInverse + '85',
    letterSpacing: 2,
  },
  balanceVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  balanceVerifiedText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textInverse + '75',
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
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
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
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  transportItemActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
  },
  transportIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
  },
  transportIconActive: {
    backgroundColor: COLORS.accent,
    borderColor: 'transparent',
  },
  transportLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  transportLabelActive: {
    color: COLORS.textInverse,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
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
    color: COLORS.textPrimary,
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
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
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
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  homeRouteCardGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
    color: '#fff',
    fontWeight: '700',
    flexShrink: 1,
  },
  homeRouteTextSecondary: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.85)',
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
    color: '#fff',
    fontWeight: '600',
  },
  homeRouteDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeDriverInitials: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '700',
  },
  homeDriverDetails: {
    flex: 1,
  },
  homeDriverName: {
    ...TYPOGRAPHY.label,
    color: '#fff',
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
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 10,
  },
  homeSeatsAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  homeSeatsText: {
    ...TYPOGRAPHY.label,
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
})
