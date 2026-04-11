import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useBookings } from '../hooks/useBookings'
import { useNotifications } from '../hooks/useNotifications'
import Toast from '../components/Toast'

export default function BookingScreen() {
  const navigation = useNavigation<any>()
  const { selectedRoute, bookingData, user, authUser, setBookingData } = useAppStore()
  const { createBooking, reservePendingBookings, finalizePendingBookings, releasePendingBookings, loading } = useBookings()
  const { createNotification } = useNotifications(authUser?.id)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [pendingBookingIds, setPendingBookingIds] = useState<string[]>(bookingData?.pending_booking_ids ?? [])
  const [bookingFinalized, setBookingFinalized] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    return () => {
      if (!bookingFinalized && pendingBookingIds.length > 0 && selectedRoute) {
        releasePendingBookings(pendingBookingIds, selectedRoute.id).catch((error) => {
          console.warn('Error releasing pending bookings on unmount:', error)
        })
      }
    }
  }, [bookingFinalized, pendingBookingIds, releasePendingBookings, selectedRoute])

  if (!selectedRoute || !user || !authUser || !bookingData || !bookingData.seat_numbers?.length) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>No hay datos de reserva</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('Main' as never, { screen: 'Search' } as never)}
          >
            <Ionicons name="search" size={20} color={COLORS.textInverse} />
            <Text style={styles.retryBtnText}>Buscar rutas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { seat_numbers, total_price } = bookingData
  const seatsCount = seat_numbers.length

  const departureDate = new Date(selectedRoute.departure_time)
  const formattedDate = departureDate.toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = departureDate.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Calcular precios
  const serviceFee = Math.round(total_price * 0.15) // 15% de fee
  const finalTotal = total_price + serviceFee

  const handleCashBooking = async () => {
    if (!authUser) {
      setToastMessage('Debes iniciar sesión para confirmar la reserva')
      setToastType('error')
      setToastVisible(true)
      return
    }

    try {
      let results

      if (pendingBookingIds.length > 0) {
        results = await finalizePendingBookings(pendingBookingIds, 'cash')
      } else {
        const bookingPromises = seat_numbers.map((seatNum: number) =>
          createBooking(
            selectedRoute.id,
            authUser.id,
            seatNum,
            selectedRoute.price_per_seat,
            'cash',
            'confirmed',
            'completed'
          )
        )
        results = await Promise.all(bookingPromises)
      }

      const allSuccessful = Array.isArray(results)
        ? results.length === seat_numbers.length && results.every((r) => r !== null)
        : !!results

      if (allSuccessful) {
        setBookingFinalized(true)
        setPendingBookingIds([])

        try {
          await createNotification(authUser.id, {
            user_id: authUser.id,
            type: 'booking',
            title: 'Reserva confirmada',
            message: `Tu reserva para ${selectedRoute.origin} → ${selectedRoute.destination} está confirmada. Asientos: ${seat_numbers.join(', ')}`,
            data: {
              route_id: selectedRoute.id,
              booking_id: Array.isArray(results) ? results[0]?.id : undefined,
              seat_numbers: seat_numbers,
              departure_time: selectedRoute.departure_time,
            },
            is_read: false,
          })
        } catch (notifError) {
          console.error('Error creando notificación:', notifError)
        }

        setToastMessage(`Reserva confirmada. Asientos: ${seat_numbers.join(', ')}`)
        setToastType('success')
        setToastVisible(true)
        navigation.navigate('TripStatus' as never)
      } else {
        setToastMessage('Some bookings failed. Please contact support.')
        setToastType('error')
        setToastVisible(true)
      }
    } catch (error: any) {
      if (error.code === 'SEAT_ALREADY_RESERVED') {
        setToastMessage('Uno de los asientos seleccionados ya fue reservado. Por favor vuelve a seleccionar.')
        setToastType('error')
        setToastVisible(true)
        setTimeout(() => navigation.navigate('SeatSelection' as never), 2000)
      } else {
        setToastMessage(error.message || 'Error al confirmar la reserva')
        setToastType('error')
        setToastVisible(true)
      }
    }
  }

  const handleConfirmBooking = async () => {
    await handleCashBooking()
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Reserva tu cupo</Text>
            <Text style={styles.subtitle}>Confirmación de viaje</Text>
          </View>
        </View>

        {/* Route Card */}
        <LinearGradient
          colors={[COLORS.primary + 'F5', COLORS.primary + 'A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tripCardGradient}
        >
          <View style={styles.routeRow}>
            <View style={[styles.routePoint, styles.routePointColumn]}>
              <View style={[styles.routeDotStart, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.routeLabel}>Desde</Text>
              <Text style={[styles.routeText, styles.routeTextWhite]} numberOfLines={2}>{selectedRoute.origin}</Text>
            </View>
            <View style={styles.routeLineContainer}>
              <View style={styles.routeLine} />
              <View style={styles.carIconContainer}>
                <Ionicons name="car-outline" size={20} color="#fff" />
              </View>
            </View>
            <View style={[styles.routePoint, styles.routePointColumn]}>
              <View style={[styles.routeDotEnd, { backgroundColor: '#10B981' }]} />
              <Text style={styles.routeLabel}>Hacia</Text>
              <Text style={[styles.routeText, styles.routeTextWhite]} numberOfLines={2}>{selectedRoute.destination}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={[styles.detailLabel, { color: 'rgba(255,255,255,0.8)' }]}>Fecha</Text>
              <Text style={[styles.detailValue, { color: '#fff' }]}>{formattedDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={[styles.detailLabel, { color: 'rgba(255,255,255,0.8)' }]}>Hora</Text>
              <Text style={[styles.detailValue, { color: '#fff' }]}>{formattedTime}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Seats Card */}
        <LinearGradient
          colors={['#FFFFFF', COLORS.primary + '1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seatsCardGradient}
        >
          <Text style={styles.sectionTitle}>Asientos seleccionados</Text>
          <View style={styles.seatsBadges}>
            {seat_numbers.map((seatNum: number) => (
              <View key={seatNum} style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>{seatNum}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.seatsSummary}>
            {seatsCount} {seatsCount === 1 ? 'asiento' : 'asientos'} · ${selectedRoute.price_per_seat.toLocaleString('es-CO')} c/u
          </Text>
        </LinearGradient>

        {/* Passenger Card */}
        <LinearGradient
          colors={['#FFFFFF', COLORS.primary + '12']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passengerCardGradient}
        >
          <Text style={styles.sectionTitle}>Datos del pasajero</Text>

          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <Text style={styles.passengerInitial}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerName}>{user.name}</Text>
              <Text style={styles.passengerPhone}>{user.phone || user.email}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Vehicle Card */}
        <LinearGradient
          colors={['#FFFFFF', COLORS.primary + '15']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.vehicleCardGradient}
        >
          <View style={styles.vehicleRow}>
            <Ionicons name="car" size={20} color={COLORS.primary} />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{selectedRoute.vehicle_make} {selectedRoute.vehicle_color}</Text>
              <Text style={styles.vehiclePlate}>{selectedRoute.vehicle_plate}</Text>
            </View>
          </View>
          {selectedRoute.driver_name && (
            <View style={styles.driverRow}>
              <Ionicons name="person" size={20} color={COLORS.textSecondary} />
              <Text style={styles.driverName}>Conductor: {selectedRoute.driver_name}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Payment Method */}
        <LinearGradient
          colors={['#FFFFFF', COLORS.primary + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.paymentCardGradient}
        >
          <Text style={styles.sectionTitle}>Método de pago</Text>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={[styles.paymentRadio, paymentMethod === 'cash' && styles.paymentRadioSelected]}>
              {paymentMethod === 'cash' && <View style={styles.paymentRadioInner} />}
            </View>
            <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cash' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.paymentText, paymentMethod === 'cash' && styles.paymentTextActive]}>
              Pago en efectivo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, styles.paymentOptionDisabled]}
            disabled
          >
            <View style={styles.paymentRadio} />
            <Ionicons name="card-outline" size={24} color={COLORS.textSecondary} />
            <Text style={[styles.paymentText, styles.paymentTextDisabled]}>
              Tarjeta (próximamente)
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Price Summary */}
        <LinearGradient
          colors={['#FFFFFF', COLORS.primary + '0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.priceCardGradient}
        >
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Viaje ({seatsCount} × ${selectedRoute.price_per_seat.toLocaleString('es-CO')})
            </Text>
            <Text style={styles.priceValue}>
              ${total_price.toLocaleString('es-CO')}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Fee de servicio (15%)</Text>
            <Text style={styles.priceValue}>${serviceFee.toLocaleString('es-CO')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>Total a pagar</Text>
            <Text style={styles.priceTotalValue}>
              ${finalTotal.toLocaleString('es-CO')}
            </Text>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <LinearGradient
          colors={
            loading
              ? [COLORS.border, COLORS.border]
              : [COLORS.primary, COLORS.primary + 'E0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.confirmBtnGradient}
        >
          <TouchableOpacity
            style={styles.confirmBtnInner}
            onPress={handleConfirmBooking}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirmar reserva</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
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
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Trip Card
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
  },
  tripCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  routePoint: {
    alignItems: 'center',
  },
  routePointColumn: {
    flex: 0,
    minWidth: 110,
    maxWidth: 120,
  },
  routeDotStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: SPACING.xs,
  },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: SPACING.xs,
  },
  routeLabel: {
    ...TYPOGRAPHY.label,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  routeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  routeTextWhite: {
    color: '#fff',
  },
  routeLine: {
    position: 'absolute',
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  },
  routeLineContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  carIconContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: SPACING.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.lg,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },

  // Seats Card
  seatsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  seatsCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  seatsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  seatBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  seatBadgeText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  seatsSummary: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Passenger Card
  passengerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  passengerCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  passengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitial: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  passengerPhone: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  vehicleCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  vehiclePlate: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  driverName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  paymentCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  paymentOptionActive: {
    backgroundColor: COLORS.primary + '10',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioSelected: {
    borderColor: COLORS.primary,
  },
  paymentRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  paymentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  paymentTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  paymentTextDisabled: {
    color: COLORS.textSecondary,
  },

  // Price Card
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  priceCardGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  priceLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  priceTotalLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  priceTotalValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Buttons
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.orangeSoft,
    borderTopColor: COLORS.shadowWhiteMid,
    borderTopWidth: 2,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  confirmBtnGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  confirmBtnInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  retryBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
})
