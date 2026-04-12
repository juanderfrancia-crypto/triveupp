import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'

export default function SearchScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { routes, loading, error, fetchRoutes } = useRoutes()
  const { setSelectedRoute } = useAppStore()
  const routeTransportType = useMemo(() => {
    if (route.params && typeof route.params === 'object' && 'transportType' in route.params) {
      return route.params.transportType as 'all' | 'auto' | 'taxi' | 'busetica' | 'buseta'
    }
    return 'all'
  }, [route.params])

  const routeDestination = useMemo(() => {
    if (route.params && typeof route.params === 'object' && 'destination' in route.params) {
      return String(route.params.destination)
    }
    return ''
  }, [route.params])

  const routeOrigin = useMemo(() => {
    if (route.params && typeof route.params === 'object' && 'origin' in route.params) {
      return String(route.params.origin)
    }
    return ''
  }, [route.params])

  const [search, setSearch] = useState(() => routeDestination || '')
  const [filter, setFilter] = useState<'all' | 'available'>('all')
  const [transportType, setTransportType] = useState<'all' | 'auto' | 'taxi' | 'busetica' | 'buseta'>(routeTransportType)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setSearch(routeDestination)
  }, [routeDestination])

  useEffect(() => {
    setTransportType(routeTransportType)
  }, [routeTransportType])

  const loadRoutes = useCallback(async (
    type: 'all' | 'auto' | 'taxi' | 'busetica' | 'buseta' = transportType,
    origin?: string,
    destination?: string,
  ) => {
    try {
      await fetchRoutes(
        origin && origin.length > 0 ? origin : undefined,
        destination && destination.length > 0 ? destination : undefined,
        type,
      )
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar las rutas')
    }
  }, [fetchRoutes, transportType])

  useEffect(() => {
    setTransportType(routeTransportType)
  }, [routeTransportType])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadRoutes(routeTransportType, routeOrigin, routeDestination)
    } finally {
      setRefreshing(false)
    }
  }, [loadRoutes, routeTransportType, routeOrigin, routeDestination])

  useFocusEffect(
    useCallback(() => {
      loadRoutes(routeTransportType, routeOrigin, routeDestination)
      return () => {}
    }, [loadRoutes, routeTransportType, routeOrigin, routeDestination])
  )

  const showLoading = loading && routes.length === 0

  const displayRoutes = useMemo(() => {
    return routes.filter((route) => {
      const matchSearch =
        route.origin.toLowerCase().includes(search.toLowerCase()) ||
        route.destination.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || route.available_seats > 0
      const matchVehicleType =
        transportType === 'all' || route.vehicle_type === transportType
      return matchSearch && matchFilter && matchVehicleType
    })
  }, [routes, search, filter, transportType])

  const handleSelectRoute = (route: Route) => {
    // Guardar la ruta seleccionada en el store
    setSelectedRoute(route)
    // Navegar a SeatSelection
    navigation.navigate('SeatSelection' as never)
  }

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`
  }

  const formatTime = (departureTime: string, arrivalTime: string) => {
    const start = new Date(departureTime)
    const end = new Date(arrivalTime)
    const diff = (end.getTime() - start.getTime()) / (1000 * 60) // minutos
    
    if (diff < 60) {
      return `~${Math.round(diff)} min`
    } else {
      const hours = Math.floor(diff / 60)
      const mins = diff % 60
      return `~${hours}h ${mins}min`
    }
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <View style={styles.decorativeCircleLarge} />
      <View style={styles.decorativeCircleSmall} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Rutas disponibles</Text>
            <Text style={styles.subtitle}>{displayRoutes.length} rutas encontradas</Text>
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por origen o destino"
              placeholderTextColor={COLORS.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Ionicons
                name="list"
                size={16}
                color={filter === 'all' ? COLORS.textInverse : COLORS.textSecondary}
              />
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'available' && styles.filterTabActive]}
              onPress={() => setFilter('available')}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={filter === 'available' ? COLORS.textInverse : COLORS.textSecondary}
              />
              <Text style={[styles.filterText, filter === 'available' && styles.filterTextActive]}>
                Con puestos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {showLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Buscando rutas...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadRoutes}>
              <Ionicons name="refresh" size={18} color={COLORS.textInverse} />
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : displayRoutes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No hay rutas disponibles</Text>
            <Text style={styles.emptyText}>
              {search || filter === 'available'
                ? 'Intenta con otros criterios de búsqueda'
                : 'No hay rutas disponibles en este momento'}
            </Text>
          </View>
        ) : (
          <View style={styles.routesContainer}>
            {displayRoutes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCardWrapper}
                onPress={() => handleSelectRoute(route)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primaryDark, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.routeCardGradient}
                >
                  {/* Status Badge */}
                  <View style={[styles.routeCardBadge, route.available_seats > 0 ? styles.badgeAvailable : styles.badgeFull]}>
                    <Ionicons name={route.available_seats > 0 ? 'checkmark-circle' : 'close-circle'} size={12} color={COLORS.textInverse} />
                    <Text style={styles.routeCardBadgeText}>
                      {route.available_seats > 0 ? 'Disponible' : 'Lleno'}
                    </Text>
                  </View>

                  {route.vehicle_type && (
                    <View style={styles.routeCardType}>
                      <Text style={styles.routeCardTypeText}>{route.vehicle_type}</Text>
                    </View>
                  )}

                  {/* Route Section */}
                  <View style={styles.routeCardRouteSection}>
                    <View style={styles.routeCardOrigin}>
                      <View style={styles.routeCardLocationIcon}>
                        <Ionicons name="location" size={18} color="#fff" />
                      </View>
                      <View style={styles.routeCardLocationText}>
                        <Text style={styles.routeCardLocationLabel}>SALIDA</Text>
                        <Text style={styles.routeCardLocationName}>{route.origin}</Text>
                      </View>
                    </View>

                    <View style={styles.routeCardArrow}>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.textInverse} />
                    </View>

                    <View style={styles.routeCardDestination}>
                      <View style={styles.routeCardLocationIcon}>
                        <Ionicons name="location" size={18} color="#fff" />
                      </View>
                      <View style={styles.routeCardLocationText}>
                        <Text style={styles.routeCardLocationLabel}>DESTINO</Text>
                        <Text style={styles.routeCardLocationName}>{route.destination}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer with Details */}
                  <View style={styles.routeCardFooterSection}>
                    <View style={styles.routeCardFooterItem}>
                      <Ionicons name="time-outline" size={14} color={COLORS.textInverse} />
                      <Text style={styles.routeCardFooterText}>
                        {formatTime(route.departure_time, route.arrival_time)}
                      </Text>
                    </View>
                    <View style={styles.routeCardFooterDivider} />
                    <View style={styles.routeCardFooterItem}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.textInverse} />
                      <Text style={styles.routeCardFooterText}>
                        {new Date(route.departure_time).toLocaleDateString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.routeCardFooterDivider} />
                    <View style={styles.routeCardFooterItem}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.textInverse} />
                      <Text style={styles.routeCardFooterText}>{formatPrice(route.price_per_seat)}</Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* Availability Badge + CTA */}
                <View style={styles.routeCardBottom}>
                  <View
                    style={[
                      styles.routeCardAvailability,
                      route.available_seats === 0
                        ? styles.availabilityFull
                        : route.available_seats <= 2
                        ? styles.availabilityLow
                        : styles.availabilityOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.availabilityText,
                        route.available_seats === 0
                          ? styles.availabilityTextFull
                          : route.available_seats <= 2
                          ? styles.availabilityTextLow
                          : styles.availabilityTextOk,
                      ]}
                    >
                      {route.available_seats === 0
                        ? '🔴 Lleno'
                        : `🟢 ${route.available_seats} ${route.available_seats === 1 ? 'puesto' : 'puestos'}`}
                    </Text>
                  </View>

                  <View style={styles.routeCardCTA}>
                    <Text style={styles.routeCardCTAText}>Ver detalles</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textInverse} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeCircleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.surface + 'EE',
    top: -70,
    left: -50,
  },
  decorativeCircleSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.accentLight + '18',
    top: 120,
    right: -40,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: SPACING.xxxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Search Container
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 52,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface + 'F8', // 97.3% opacidad
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '99', // Semi-transparente
    // Luz blanca en el borde superior
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
    ...SHADOWS.sm,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.orangeSoft,
    borderTopColor: COLORS.shadowWhiteMid,
    borderTopWidth: 2,
  },
  filterText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxxl,
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.orangeSoft,
    // Sombra adicional para profundidad
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    // Bordes blancos para realismo
    borderTopWidth: 2,
    borderTopColor: COLORS.shadowWhiteMid,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.shadowWhiteDark,
  },
  retryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Routes Container
  routesContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Route Card - NEW GRADIENT STYLE
  routeCardWrapper: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  routeCardGradient: {
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  routeCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badgeAvailable: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
  },
  badgeFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
  },
  routeCardBadgeText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  routeCardType: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  routeCardTypeText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  routeCardRouteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  routeCardOrigin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeCardDestination: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeCardLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCardLocationText: {
    flex: 1,
  },
  routeCardLocationLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse + 'CC',
    marginBottom: SPACING.xs,
  },
  routeCardLocationName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  routeCardArrow: {
    paddingHorizontal: SPACING.sm,
  },
  routeCardFooterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  routeCardFooterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  routeCardFooterText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textInverse,
    fontWeight: '600',
    flex: 1,
  },
  routeCardFooterDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: SPACING.md,
  },
  routeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryDark,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  routeCardAvailability: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  availabilityOk: {
    backgroundColor: COLORS.success + '20',
  },
  availabilityLow: {
    backgroundColor: COLORS.warning + '20',
  },
  availabilityFull: {
    backgroundColor: COLORS.error + '20',
  },
  availabilityText: {
    ...TYPOGRAPHY.label,
    fontWeight: '600',
  },
  availabilityTextOk: {
    color: COLORS.success,
  },
  availabilityTextLow: {
    color: COLORS.warning,
  },
  availabilityTextFull: {
    color: COLORS.error,
  },
  routeCardCTA: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
  },
  routeCardCTAText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Deprecated styles (kept for compatibility)
  routeCard: {
    display: 'none',
  },
  routeCardHeader: {
    display: 'none',
  },
  routePoints: {
    display: 'none',
  },
  routeFrom: {
    display: 'none',
  },
  arrowContainer: {
    display: 'none',
  },
  routeTo: {
    display: 'none',
  },
  routePrice: {
    display: 'none',
  },
  routeDetails: {
    display: 'none',
  },
  detailItem: {
    display: 'none',
  },
  detailText: {
    display: 'none',
  },
  detailDivider: {
    display: 'none',
  },
  seatsBadge: {
    display: 'none',
  },
  seatsOk: {
    display: 'none',
  },
  seatsLow: {
    display: 'none',
  },
  seatsFull: {
    display: 'none',
  },
  seatsText: {
    display: 'none',
  },
  seatsTextOk: {
    display: 'none',
  },
  seatsTextLow: {
    display: 'none',
  },
  seatsTextFull: {
    display: 'none',
  },
  routeFooter: {
    display: 'none',
  },
  ctaText: {
    display: 'none',
  },
})
