import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Animated,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useRoutes, Route } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'
import { errorHandler, ErrorType, ErrorSeverity } from '../services/errorHandler'
import OfflineBanner from '../components/OfflineBanner'
import RouteCard from '../components/RouteCard'
import DriverDetailsBottomSheet from '../components/DriverDetailsBottomSheet'
import { useDriverReputation } from '../hooks/useDriverReputation'

// Tipos para ordenar
type SortOption = 'departure' | 'price' | 'rating' | 'available'
type TransportFilter = 'all' | 'auto' | 'taxi' | 'busetica' | 'buseta'
type AvailabilityFilter = 'all' | 'available'

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
  const [filter, setFilter] = useState<AvailabilityFilter>('all')
  const [transportType, setTransportType] = useState<TransportFilter>(routeTransportType)
  const [sortBy, setSortBy] = useState<SortOption>('departure')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string; route: Route } | null>(null)
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Animación para el header al hacer scroll
  const scrollY = useRef(new Animated.Value(0)).current

  // Fetch reputation for selected driver
  const { reputation, loading: reputationLoading } = useDriverReputation(selectedDriver?.id || '')

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
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('Failed to fetch')) {
        errorHandler.handle(
          'Sin conexión a internet',
          ErrorType.NETWORK,
          ErrorSeverity.HIGH,
          true,
          { context: 'search_routes' }
        )
      } else if (err.message?.includes('not found')) {
        errorHandler.handle(
          'No hay rutas disponibles con esos criterios',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'search_no_routes', origin, destination }
        )
      } else {
        errorHandler.handle(
          err,
          ErrorType.DATABASE,
          ErrorSeverity.MEDIUM,
          true,
          { context: 'search_routes_error' }
        )
      }
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
    // First filter
    let filtered = routes.filter((route) => {
      const matchSearch =
        route.origin.toLowerCase().includes(search.toLowerCase()) ||
        route.destination.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || route.available_seats > 0
      const matchVehicleType =
        transportType === 'all' || route.vehicle_type === transportType
      return matchSearch && matchFilter && matchVehicleType
    })

    // Then sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price_per_seat - b.price_per_seat
        case 'available':
          return b.available_seats - a.available_seats
        case 'rating':
          return (b.driver_rating || 0) - (a.driver_rating || 0)
        case 'departure':
        default:
          return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
      }
    })
  }, [routes, search, filter, transportType, sortBy])

  const handleSelectRoute = (route: Route) => {
    // Guardar la ruta seleccionada en el store
    setSelectedRoute(route)
    // Navegar a SeatSelection
    navigation.navigate('SeatSelection' as never)
  }

  const handleOpenDetails = (driverId: string) => {
    const route = displayRoutes.find(r => r.driver_id === driverId)
    if (route) {
      setSelectedDriver({ id: driverId, name: route.driver_name || 'Conductor', route })
      setBottomSheetVisible(true)
    }
  }

  const handleReserveFromBottomSheet = () => {
    if (selectedDriver?.route) {
      setSelectedRoute(selectedDriver.route)
      setBottomSheetVisible(false)
      navigation.navigate('SeatSelection' as never)
    }
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
      <OfflineBanner />

      {/* Sticky Header with Search */}
      <View style={[styles.stickyHeader, isSearchFocused && styles.stickyHeaderFocused]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Buscar rutas</Text>
            {displayRoutes.length > 0 && (
              <Text style={styles.subtitle}>{displayRoutes.length} rutas</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Box - Enhanced */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, isSearchFocused && styles.searchBoxFocused]}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="¿A dónde vas? Origen o destino..."
              placeholderTextColor={COLORS.textTertiary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Filters Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContainer}
        >
          {/* Availability Filter */}
          <TouchableOpacity
            style={[styles.quickFilterChip, filter === 'available' && styles.quickFilterChipActive]}
            onPress={() => setFilter(filter === 'available' ? 'all' : 'available')}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={filter === 'available' ? '#FFFFFF' : COLORS.success}
            />
            <Text style={[styles.quickFilterText, filter === 'available' && styles.quickFilterTextActive]}>
              Con puestos
            </Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.filterSeparator} />

          {/* Transport Type Chips */}
          <TouchableOpacity
            style={[styles.transportChip, transportType === 'all' && styles.transportChipActive]}
            onPress={() => setTransportType('all')}
          >
            <Text style={[styles.transportChipText, transportType === 'all' && styles.transportChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.transportChip, transportType === 'auto' && styles.transportChipActive]}
            onPress={() => setTransportType('auto')}
          >
            <Ionicons name="car-sport" size={14} color={transportType === 'auto' ? '#FFFFFF' : COLORS.textSecondary} />
            <Text style={[styles.transportChipText, transportType === 'auto' && styles.transportChipTextActive]}>
              Auto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.transportChip, transportType === 'taxi' && styles.transportChipActive]}
            onPress={() => setTransportType('taxi')}
          >
            <Ionicons name="car" size={14} color={transportType === 'taxi' ? '#FFFFFF' : COLORS.textSecondary} />
            <Text style={[styles.transportChipText, transportType === 'taxi' && styles.transportChipTextActive]}>
              Taxi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.transportChip, transportType === 'busetica' && styles.transportChipActive]}
            onPress={() => setTransportType('busetica')}
          >
            <Ionicons name="bus" size={14} color={transportType === 'busetica' ? '#FFFFFF' : COLORS.textSecondary} />
            <Text style={[styles.transportChipText, transportType === 'busetica' && styles.transportChipTextActive]}>
              Busetica
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.transportChip, transportType === 'buseta' && styles.transportChipActive]}
            onPress={() => setTransportType('buseta')}
          >
            <Ionicons name="bus" size={14} color={transportType === 'buseta' ? '#FFFFFF' : COLORS.textSecondary} />
            <Text style={[styles.transportChipText, transportType === 'buseta' && styles.transportChipTextActive]}>
              Buseta
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Scrollable Content */}
      <Animated.ScrollView
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
        scrollEventThrottle={16}
      >
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
            {/* @ts-ignore - onPress async handler */}
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
              <RouteCard
                key={route.id}
                route={route}
                onPress={handleSelectRoute}
                onDetails={handleOpenDetails}
                formatTime={formatTime}
                formatPrice={formatPrice}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Ordenar por</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {[
              { key: 'departure', label: 'Hora de salida', icon: 'time-outline' },
              { key: 'price', label: 'Precio (menor primero)', icon: 'cash-outline' },
              { key: 'available', label: 'Más puestos disponibles', icon: 'people-outline' },
              { key: 'rating', label: 'Mejor valorados', icon: 'star-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy(option.key as SortOption)
                  setShowSortModal(false)
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={sortBy === option.key ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Sheet for Driver Details */}
      <DriverDetailsBottomSheet
        visible={bottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        onReserve={handleReserveFromBottomSheet}
        reputation={reputation}
        driverName={selectedDriver?.name || 'Conductor'}
        loading={reputationLoading}
        route={selectedDriver?.route}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Sticky Header
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    ...SHADOWS.sm,
  },
  stickyHeaderFocused: {
    borderBottomColor: COLORS.primary + '30',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Container (inside sticky header)
  searchContainer: {
    marginBottom: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },

  // Quick Filters
  quickFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  filterSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: SPACING.xs,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickFilterChipActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  quickFilterText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },

  // Transport Chips
  transportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transportChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  transportChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  transportChipTextActive: {
    color: '#FFFFFF',
  },

  // Content ScrollView
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
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
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  retryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
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
    textAlign: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Routes Container
  routesContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortModalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  sortOptionActive: {
    backgroundColor: COLORS.primary + '08',
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sortOptionText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
})
