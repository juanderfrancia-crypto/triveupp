import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAvailableRides } from '../hooks/useAvailableRides'
import { useAppStore } from '../store/useAppStore'

export default function AvailableRidesScreen() {
  const navigation = useNavigation()
  const { rides, loading, error, refetch } = useAvailableRides()
  const { setSelectedRoute, authUser } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleReserve = (ride: any) => {
    if (!authUser) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reservar un viaje.', [
        { text: 'Aceptar', onPress: () => navigation.navigate('Login' as never) },
      ])
      return
    }

    // Set selected route in store
    setSelectedRoute(ride)

    // Navigate to seat selection
    navigation.navigate('SeatSelection' as never)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const getMinutesUntilDeparture = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.round(diffMs / 60000)
    
    if (diffMins < 60) return `en ${diffMins} min`
    if (diffMins < 1440) return `en ${Math.round(diffMins / 60)}h`
    return `en ${Math.round(diffMins / 1440)}d`
  }

  const renderRideCard = ({ item: ride }: any) => (
    <View style={styles.rideCard}>
      {/* Header: Origin → Destination */}
      <View style={styles.routeInfo}>
        <View style={styles.routeStart}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.origin}
          </Text>
        </View>

        <View style={styles.routeDash}>
          <View style={styles.dashLine} />
          <Ionicons name="arrow-forward" size={16} color={COLORS.secondary} />
          <View style={styles.dashLine} />
        </View>

        <View style={styles.routeEnd}>
          <Ionicons name="location" size={20} color={COLORS.error} />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.destination}
          </Text>
        </View>
      </View>

      {/* Time & Availability */}
      <View style={styles.timeAvailability}>
        <View style={styles.timeBlock}>
          <Ionicons name="time" size={16} color={COLORS.textSecondary} />
          <Text style={styles.timeText}>{formatTime(ride.departure_time)}</Text>
          <Text style={styles.minutesText}>{getMinutesUntilDeparture(ride.departure_time)}</Text>
        </View>

        <View style={styles.availabilityBlock}>
          <View style={styles.seatsBox}>
            <Text style={styles.seatsCount}>{ride.seats_available_count}</Text>
            <Text style={styles.seatsLabel}>de {ride.total_seats}</Text>
          </View>
          <Text style={styles.seatsText}>asientos</Text>
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>por persona</Text>
          <Text style={styles.priceValue}>${ride.price_per_seat.toLocaleString()}</Text>
        </View>
      </View>

      {/* Driver Info */}
      <View style={styles.driverInfo}>
        {ride.driver_photo ? (
          <Image source={{ uri: ride.driver_photo }} style={styles.driverPhoto} />
        ) : (
          <View style={[styles.driverPhoto, styles.driverPhotoPlaceholder]}>
            <Ionicons name="person" size={24} color={COLORS.textTertiary} />
          </View>
        )}

        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{ride.driver_name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.warning} />
            <Text style={styles.ratingText}>
              {ride.driver_rating.toFixed(1)} ({ride.driver_review_count})
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => handleReserve(ride)}
          activeOpacity={0.8}
        >
          <View style={styles.reserveGradient}>
            <Text style={styles.reserveText}>Reservar</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleInfo}>
        <View style={styles.vehicleTag}>
          <Ionicons name="car" size={14} color={COLORS.secondary} />
          <Text style={styles.vehicleType}>{ride.vehicle_type || 'Auto'}</Text>
        </View>
        <Text style={styles.vehicleDetail}>{ride.vehicle_color}</Text>
        <Text style={styles.vehiclePlate}>{ride.vehicle_plate}</Text>
      </View>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No hay viajes disponibles</Text>
      <Text style={styles.emptyText}>
        Prueba con diferentes ciudades o horarios
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
        <Text style={styles.emptyButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  )

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={COLORS.error} />
      <Text style={styles.errorTitle}>Error cargando viajes</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.errorButton} onPress={onRefresh}>
        <Text style={styles.errorButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Viajes Disponibles</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && rides.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Buscando viajes...</Text>
        </View>
      ) : error && rides.length === 0 ? (
        renderError()
      ) : rides.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.surface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
  },
  errorButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.surface,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  routeInfo: {
    marginBottom: SPACING.md,
  },
  routeStart: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  routeText: {
    ...TYPOGRAPHY.subtitle1,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
    fontWeight: '600',
  },
  routeDash: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs,
    paddingLeft: 8,
  },
  dashLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  routeEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  timeAvailability: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.text,
    fontWeight: '700',
  },
  minutesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  availabilityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  seatsBox: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  seatsCount: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  seatsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  seatsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.primary,
    fontWeight: '700',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  driverPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  driverPhotoPlaceholder: {
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    ...TYPOGRAPHY.subtitle2,
    color: COLORS.text,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  reserveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
  },
  reserveGradient: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  reserveText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  vehicleType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  vehicleDetail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  vehiclePlate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginLeft: 'auto',
  },
})
