import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useDriverReputation } from '../hooks/useDriverReputation'
import ReputationCard from './ReputationCard'
import ReviewComments from './ReviewComments'
import type { Route } from '../hooks/useRoutes'

interface RouteCardProps {
  route: Route
  onPress: (route: Route) => void
  formatTime: (start: string, end: string) => string
  formatPrice: (price: number) => string
}

export default function RouteCard({
  route,
  onPress,
  formatTime,
  formatPrice,
}: RouteCardProps) {
  const { reputation, loading: repLoading } = useDriverReputation(route.driver_id)

  const handleSelectRoute = () => {
    onPress(route)
  }

  return (
    <TouchableOpacity
      style={styles.routeCardWrapper}
      onPress={handleSelectRoute}
      activeOpacity={0.8}
    >
      <View style={styles.routeCardGradient}>
        {/* Status Badge */}
        <View
          style={[
            styles.routeCardBadge,
            route.available_seats > 0 ? styles.badgeAvailable : styles.badgeFull,
          ]}
        >
          <Ionicons
            name={route.available_seats > 0 ? 'checkmark-circle' : 'close-circle'}
            size={12}
            color={route.available_seats > 0 ? COLORS.success : COLORS.error}
          />
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
              <Ionicons name="location" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.routeCardLocationText}>
              <Text style={styles.routeCardLocationLabel}>SALIDA</Text>
              <Text style={styles.routeCardLocationName}>{route.origin}</Text>
            </View>
          </View>

          <View style={styles.routeCardArrow}>
            <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
          </View>

          <View style={styles.routeCardDestination}>
            <View style={styles.routeCardLocationIcon}>
              <Ionicons name="location" size={18} color={COLORS.error} />
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
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.routeCardFooterText}>
              {formatTime(route.departure_time, route.arrival_time)}
            </Text>
          </View>
          <View style={styles.routeCardFooterDivider} />
          <View style={styles.routeCardFooterItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.routeCardFooterText}>
              {new Date(route.departure_time).toLocaleDateString('es-CO', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.routeCardFooterDivider} />
          <View style={styles.routeCardFooterItem}>
            <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.routeCardFooterText}>{formatPrice(route.price_per_seat)}</Text>
          </View>
        </View>

        {/* Driver & Vehicle Info */}
        <View style={styles.driverVehicleSection}>
          <View style={styles.driverVehicleRow}>
            <View style={styles.driverVehicleItem}>
              <Ionicons name="person" size={14} color={COLORS.primary} />
              <Text style={styles.driverVehicleLabel}>Conductor:</Text>
              <Text style={styles.driverVehicleValue}>{route.driver_name || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.driverVehicleRow}>
            <View style={styles.driverVehicleItem}>
              <Ionicons name="car-outline" size={14} color={COLORS.primary} />
              <Text style={styles.driverVehicleLabel}>Placa:</Text>
              <Text style={styles.driverVehicleValue}>{route.vehicle_plate || 'N/A'}</Text>
            </View>
            <View style={styles.driverVehicleItem}>
              <Ionicons name="car" size={14} color={COLORS.primary} />
              <Text style={styles.driverVehicleLabel}>Color:</Text>
              <Text style={styles.driverVehicleValue}>{route.vehicle_color || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Reputation Section */}
        {!repLoading && reputation && (
          <View style={styles.reputationSection}>
            <ReputationCard reputation={reputation} />
            <ReviewComments
              comments={reputation.reviewComments.slice(0, 3)}
              driverName={reputation.driverName}
            />
          </View>
        )}
      </View>

      {/* CTA Button */}
      <View style={styles.routeCardBottom}>
        <View
          style={[
            styles.routeCardAvailability,
            route.available_seats === 0 ? styles.availabilityFull : styles.availabilityGood,
          ]}
        >
          <Ionicons
            name="seat"
            size={14}
            color={route.available_seats === 0 ? COLORS.error : COLORS.success}
          />
          <Text
            style={[
              styles.routeCardAvailabilityText,
              route.available_seats === 0 && styles.availabilityTextFull,
            ]}
          >
            {route.available_seats === 0 ? 'Sin puestos' : `${route.available_seats} puesto(s)`}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.routeCardCTA,
            route.available_seats === 0 && styles.routeCardCTADisabled,
          ]}
          onPress={handleSelectRoute}
          disabled={route.available_seats === 0}
        >
          <Text
            style={[
              styles.routeCardCTAText,
              route.available_seats === 0 && styles.routeCardCTATextDisabled,
            ]}
          >
            Ver detalles
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={route.available_seats === 0 ? COLORS.textTertiary : COLORS.textInverse}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  routeCardWrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },

  routeCardGradient: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
  },

  routeCardBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
    zIndex: 10,
  },
  badgeAvailable: {
    backgroundColor: COLORS.success + '15',
  },
  badgeFull: {
    backgroundColor: COLORS.error + '15',
  },
  routeCardBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  routeCardType: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  routeCardTypeText: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  routeCardRouteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.lg,
  },
  routeCardOrigin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeCardDestination: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeCardLocationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  routeCardLocationText: {
    flex: 1,
  },
  routeCardLocationLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  routeCardLocationName: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  routeCardArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },

  routeCardFooterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: SPACING.lg,
  },
  routeCardFooterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  routeCardFooterText: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textSecondary,
  },
  routeCardFooterDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginHorizontal: SPACING.sm,
  },

  driverVehicleSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  driverVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  driverVehicleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  driverVehicleLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  driverVehicleValue: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  reputationSection: {
    gap: SPACING.md,
  },

  routeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  routeCardAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  availabilityGood: {},
  availabilityFull: {},
  routeCardAvailabilityText: {
    ...TYPOGRAPHY.body3,
    color: COLORS.success,
    fontWeight: '600',
  },
  availabilityTextFull: {
    color: COLORS.error,
  },

  routeCardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  routeCardCTADisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  routeCardCTAText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  routeCardCTATextDisabled: {
    color: COLORS.textSecondary,
  },
})
