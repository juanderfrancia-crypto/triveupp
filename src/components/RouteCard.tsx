import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useDriverReputation } from '../hooks/useDriverReputation'
import type { Route } from '../hooks/useRoutes'

interface RouteCardProps {
  route: Route
  onPress: (route: Route) => void
  onDetails: (driverId: string) => void
  formatTime: (start: string, end: string) => string
  formatPrice: (price: number) => string
}

export default function RouteCard({
  route,
  onPress,
  onDetails,
  formatTime,
  formatPrice,
}: RouteCardProps) {
  const { reputation } = useDriverReputation(route.driver_id)

  const getTrustColor = (rating: number) => {
    if (rating >= 4.7) return '#8B5CF6'
    if (rating >= 4.5) return '#06B6D4'
    if (rating >= 4.0) return '#10B981'
    if (rating >= 3.5) return '#F59E0B'
    return '#EF4444'
  }

  const getTrustIcon = (rating: number) => {
    if (rating >= 4.7) return 'shield-checkmark'
    if (rating >= 4.5) return 'checkmark-circle'
    if (rating >= 4.0) return 'thumbs-up'
    if (rating >= 3.5) return 'help-circle'
    return 'warning'
  }

  return (
    <TouchableOpacity
      style={styles.routeCardWrapper}
      onPress={() => onPress(route)}
      activeOpacity={0.8}
    >
      <View style={styles.routeCardContent}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            route.available_seats > 0 ? styles.badgeAvailable : styles.badgeFull,
          ]}
        >
          <Ionicons
            name={route.available_seats > 0 ? 'checkmark-circle' : 'close-circle'}
            size={12}
            color={route.available_seats > 0 ? COLORS.success : COLORS.error}
          />
          <Text style={styles.badgeText}>
            {route.available_seats > 0 ? 'Disponible' : 'Lleno'}
          </Text>
        </View>

        {route.vehicle_type && (
          <View style={styles.vehicleTypeBadge}>
            <Text style={styles.vehicleTypeText}>{route.vehicle_type}</Text>
          </View>
        )}

        {/* Route Info */}
        <View style={styles.routeSection}>
          <View style={styles.locationItem}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>SALIDA</Text>
              <Text style={styles.locationName} numberOfLines={1}>
                {route.origin}
              </Text>
            </View>
          </View>

          <Ionicons name="arrow-forward" size={14} color={COLORS.textSecondary} />

          <View style={styles.locationItem}>
            <Ionicons name="location" size={16} color={COLORS.error} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>DESTINO</Text>
              <Text style={styles.locationName} numberOfLines={1}>
                {route.destination}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {formatTime(route.departure_time, route.arrival_time)}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{formatPrice(route.price_per_seat)}</Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <Ionicons name="seat" size={12} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {route.available_seats === 0 ? '0' : route.available_seats}
            </Text>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverSection}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {route.driver_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName} numberOfLines={1}>
                {route.driver_name || 'Conductor'}
              </Text>
              <Text style={styles.vehicleInfo} numberOfLines={1}>
                {route.vehicle_plate || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Reputation Badge Compacto */}
          {reputation && (
            <TouchableOpacity
              style={[
                styles.reputationBadge,
                { backgroundColor: getTrustColor(reputation.weightedRating) + '15' },
              ]}
              onPress={() => onDetails(route.driver_id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getTrustIcon(reputation.weightedRating) as any}
                size={14}
                color={getTrustColor(reputation.weightedRating)}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.ratingText,
                    { color: getTrustColor(reputation.weightedRating) },
                  ]}
                >
                  {reputation.weightedRating.toFixed(1)}⭐
                </Text>
              </View>
              {reputation.reviewComments.length > 0 && (
                <View style={styles.commentCounter}>
                  <Ionicons name="chatbubble" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.commentCountText}>
                    {reputation.reviewComments.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <Text style={styles.seatsText}>
          {route.available_seats === 0
            ? 'Lleno'
            : `${route.available_seats} puesto${route.available_seats > 1 ? 's' : ''}`}
        </Text>
        <TouchableOpacity
          style={[
            styles.detailsButton,
            route.available_seats === 0 && styles.detailsButtonDisabled,
          ]}
          onPress={() => onPress(route)}
          disabled={route.available_seats === 0}
        >
          <Text style={styles.detailsButtonText}>Ver detalles</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
    ...SHADOWS.md,
  },

  routeCardContent: {
    padding: SPACING.lg,
  },

  // Badges
  statusBadge: {
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
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  vehicleTypeBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  vehicleTypeText: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Route Section
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  locationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  locationName: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // Details Row
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  detailDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
  },

  // Driver Section
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  driverName: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  vehicleInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  // Reputation Badge Compacto
  reputationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  ratingText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  commentCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: SPACING.xs,
  },
  commentCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Bottom Section
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  seatsText: {
    ...TYPOGRAPHY.body3,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  detailsButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  detailsButtonText: {
    ...TYPOGRAPHY.body3,
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
