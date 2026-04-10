import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useRoutes } from '../hooks/useRoutes'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../services/supabase'

const VEHICLE_TYPES = [
  { id: 'auto', name: 'Auto', maxSeats: 4, icon: 'car-sport' as const },
  { id: 'taxi', name: 'Taxi', maxSeats: 4, icon: 'car' as const },
  { id: 'busetica', name: 'Busetica', maxSeats: 15, icon: 'bus' as const },
  { id: 'buseta', name: 'Buseta', maxSeats: 70, icon: 'bus' as const },
]

export default function DriverRegisterScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { user } = useAppStore()
  const { createRoute, loading: routeLoading, error: routeError } = useRoutes()

  // Ruta campos
  const [origin, setOrigin] = useState('')
  const [originZone, setOriginZone] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationZone, setDestinationZone] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [totalSeats, setTotalSeats] = useState('')
  const [pricePerSeat, setPricePerSeat] = useState('')
  const [showVehicleTypePicker, setShowVehicleTypePicker] = useState(false)

  // Vehículo datos
  const [vehicleData, setVehicleData] = useState<any>(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)

  const selectedVehicleType = VEHICLE_TYPES.find((v) => v.id === vehicleTypeId)
  const maxSeats = selectedVehicleType?.maxSeats || 0

  // Manejar cambio de asientos con validación automática
  const handleTotalSeatsChange = (text: string) => {
    if (!text) {
      setTotalSeats('')
      return
    }
    const num = parseInt(text, 10)
    if (num > maxSeats) {
      setTotalSeats(String(maxSeats))
    } else if (num < 1 && text !== '') {
      setTotalSeats('')
    } else {
      setTotalSeats(text)
    }
  }

  // Cargar datos del vehículo al montar
  useEffect(() => {
    loadVehicleData()
  }, [user?.id])

  const loadVehicleData = async () => {
    try {
      setVehicleLoading(true)
      const { data, error } = await supabase
        .from('routes')
        .select('vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color')
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setVehicleData(data)
      }
    } catch (err) {
      console.log('No hay rutas previas', err)
    } finally {
      setVehicleLoading(false)
    }
  }

  const validateForm = () => {
    if (!origin.trim()) {
      Alert.alert('Error', 'Por favor ingresa la ciudad de origen')
      return false
    }
    if (!originZone.trim()) {
      Alert.alert('Error', 'Por favor ingresa la zona de salida')
      return false
    }
    if (!destination.trim()) {
      Alert.alert('Error', 'Por favor ingresa la ciudad de destino')
      return false
    }
    if (!destinationZone.trim()) {
      Alert.alert('Error', 'Por favor ingresa la zona de llegada')
      return false
    }
    if (!departureTime.trim()) {
      Alert.alert('Error', 'Por favor ingresa la hora de salida (ej: 08:30)')
      return false
    }
    if (!arrivalTime.trim()) {
      Alert.alert('Error', 'Por favor ingresa la hora de llegada (ej: 10:30)')
      return false
    }
    if (!vehicleTypeId) {
      Alert.alert('Error', 'Por favor selecciona un tipo de vehículo')
      return false
    }
    if (!totalSeats.trim() || parseInt(totalSeats) < 1 || parseInt(totalSeats) > maxSeats) {
      Alert.alert('Error', `Por favor ingresa asientos válidos (1-${maxSeats})`)
      return false
    }
    if (!pricePerSeat.trim() || parseFloat(pricePerSeat) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un precio válido')
      return false
    }
    if (!vehicleData) {
      Alert.alert('Error', 'Por favor agrega información de tu vehículo primero en "Mi Vehículo"')
      return false
    }
    return true
  }

  const handleCreateRoute = async () => {
    if (!validateForm()) return
    if (!user?.id) {
      Alert.alert('Error', 'Usuario no autenticado')
      return
    }

    try {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]

      const routeData = {
        driver_id: user.id,
        origin: `${origin.trim()} - ${originZone.trim()}`,
        destination: `${destination.trim()} - ${destinationZone.trim()}`,
        departure_time: `${dateStr}T${departureTime}:00`,
        arrival_time: `${dateStr}T${arrivalTime}:00`,
        price_per_seat: parseFloat(pricePerSeat),
        total_seats: parseInt(totalSeats),
        available_seats: parseInt(totalSeats),
        vehicle_make: vehicleData.vehicle_make,
        vehicle_model: vehicleData.vehicle_model || '',
        vehicle_year: vehicleData.vehicle_year,
        vehicle_plate: vehicleData.vehicle_plate,
        vehicle_color: vehicleData.vehicle_color,
        vehicle_type: vehicleTypeId,
        status: 'scheduled',
      }

      const newRoute = await createRoute(routeData as any)

      Alert.alert(
        'Éxito',
        '¡Ruta creada correctamente! Los pasajeros ya pueden verla y reservar.',
        [
          {
            text: 'Ir al inicio',
            onPress: () => {
              navigation.navigate('Main' as never)
            },
          },
        ]
      )

      // Limpiar formulario
      setOrigin('')
      setOriginZone('')
      setDestination('')
      setDestinationZone('')
      setDepartureTime('')
      setArrivalTime('')
      setVehicleTypeId('')
      setTotalSeats('')
      setPricePerSeat('')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al crear la ruta. Intenta de nuevo.')
    }
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Crea tu ruta</Text>
            <Text style={styles.subtitle}>Publica tu viaje y gana dinero</Text>
          </View>
        </View>

        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
          </View>
          <Text style={styles.introTitle}>Conductor Verificado</Text>
          <Text style={styles.introText}>
            Publica tus rutas y conecta con pasajeros confiables
          </Text>
        </View>

        {/* RUTA DETAILS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="map" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Detalles de la ruta</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Ciudad origen"
              placeholderTextColor={COLORS.textTertiary}
              value={origin}
              onChangeText={setOrigin}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Zona/punto de salida"
              placeholderTextColor={COLORS.textTertiary}
              value={originZone}
              onChangeText={setOriginZone}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate-circle" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Ciudad destino"
              placeholderTextColor={COLORS.textTertiary}
              value={destination}
              onChangeText={setDestination}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="Zona/punto de llegada"
              placeholderTextColor={COLORS.textTertiary}
              value={destinationZone}
              onChangeText={setDestinationZone}
              editable={!routeLoading}
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Ionicons name="time" size={20} color={COLORS.accent} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textTertiary}
                value={departureTime}
                onChangeText={setDepartureTime}
                maxLength={5}
                editable={!routeLoading}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: SPACING.md }]}>
              <Ionicons name="time" size={20} color={COLORS.accent} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textTertiary}
                value={arrivalTime}
                onChangeText={setArrivalTime}
                maxLength={5}
                editable={!routeLoading}
              />
            </View>
          </View>
        </View>

        {/* VEHICLE TYPE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="car" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Tipo de vehículo</Text>
          </View>

          <TouchableOpacity
            style={styles.vehicleTypeSelector}
            onPress={() => setShowVehicleTypePicker(true)}
          >
            <Ionicons name="car-sport" size={20} color={COLORS.primary} />
            <Text style={[styles.vehicleTypeSelectorText, !vehicleTypeId && { color: COLORS.textTertiary }]}>
              {selectedVehicleType ? selectedVehicleType.name : 'Selecciona un tipo'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {vehicleTypeId && (
            <View style={styles.vehicleTypeInfo}>
              <Text style={styles.vehicleTypeInfoText}>
                Capacidad: hasta {maxSeats} pasajeros
              </Text>
            </View>
          )}
        </View>

        {/* SEATS & PRICE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="ticket" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Asientos y tarifa</Text>
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Ionicons name="people" size={20} color={COLORS.accent} />
              <TextInput
                style={styles.input}
                placeholder={vehicleTypeId ? `Hasta ${maxSeats}` : 'Selecciona tipo'}
                placeholderTextColor={COLORS.textTertiary}
                value={totalSeats}
                onChangeText={handleTotalSeatsChange}
                keyboardType="numeric"
                maxLength={`${maxSeats}`.length}
                editable={!routeLoading && !!vehicleTypeId}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: SPACING.md }]}>
              <Ionicons name="cash" size={20} color={COLORS.accent} />
              <TextInput
                style={styles.input}
                placeholder="Precio"
                placeholderTextColor={COLORS.textTertiary}
                value={pricePerSeat}
                onChangeText={setPricePerSeat}
                keyboardType="decimal-pad"
                editable={!routeLoading}
              />
            </View>
          </View>

          {totalSeats && pricePerSeat && (
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.summaryLabel}>Asientos disponibles</Text>
                </View>
                <Text style={styles.summaryValue}>{totalSeats}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="trending-up" size={20} color={COLORS.accent} />
                  <Text style={styles.summaryLabel}>Ingreso estimado</Text>
                </View>
                <Text style={[styles.summaryValue, { color: COLORS.accent }]}>
                  ${(parseInt(totalSeats) * parseFloat(pricePerSeat)).toLocaleString('es-CO')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* VEHICLE INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="car" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Datos del vehículo</Text>
          </View>

          {vehicleLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : vehicleData ? (
            <View style={styles.vehicleInfoBox}>
              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Marca</Text>
                </View>
                <Text style={styles.vehicleInfoValue}>{vehicleData.vehicle_make}</Text>
              </View>

              <View style={styles.vehicleInfoDivider} />

              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Año</Text>
                </View>
                <Text style={styles.vehicleInfoValue}>{vehicleData.vehicle_year}</Text>
              </View>

              <View style={styles.vehicleInfoDivider} />

              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="layers" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Placa</Text>
                </View>
                <Text style={[styles.vehicleInfoValue, styles.plateBadge]}>{vehicleData.vehicle_plate}</Text>
              </View>

              <View style={styles.vehicleInfoDivider} />

              <View style={styles.vehicleInfoRow}>
                <View style={styles.vehicleInfoLeft}>
                  <Ionicons name="color-palette" size={20} color={COLORS.primary} />
                  <Text style={styles.vehicleInfoLabel}>Color</Text>
                </View>
                <Text style={styles.vehicleInfoValue}>{vehicleData.vehicle_color}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyVehicleBox}>
              <Ionicons name="alert-circle" size={32} color={COLORS.accent} />
              <Text style={styles.emptyVehicleTitle}>Sin información de vehículo</Text>
              <Text style={styles.emptyVehicleText}>
                Completa los datos de tu vehículo en "Mi Vehículo" primero
              </Text>
              <TouchableOpacity
                style={styles.editVehicleButton}
                onPress={() => navigation.navigate('VehicleInfo' as never)}
              >
                <Ionicons name="pencil" size={16} color="white" />
                <Text style={styles.editVehicleButtonText}>Ir a Mi Vehículo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconBox}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Información importante</Text>
            <Text style={styles.infoText}>
              Tu ruta será visible inmediatamente. Asegúrate de que todos los datos sean correctos.
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.submitBtn, routeLoading && styles.submitBtnDisabled]}
          onPress={handleCreateRoute}
          disabled={routeLoading}
          activeOpacity={0.8}
        >
          {routeLoading ? (
            <ActivityIndicator size="small" color={COLORS.textInverse} />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color={COLORS.textInverse} />
              <Text style={styles.submitBtnText}>Publicar Ruta</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={routeLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>

        {/* Vehicle Type Picker Modal */}
        <Modal
          visible={showVehicleTypePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVehicleTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecciona tipo de vehículo</Text>
                <TouchableOpacity onPress={() => setShowVehicleTypePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={VEHICLE_TYPES}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.vehicleTypeOption,
                      vehicleTypeId === item.id && styles.vehicleTypeOptionSelected,
                    ]}
                    onPress={() => {
                      setVehicleTypeId(item.id)
                      setTotalSeats('')
                      setShowVehicleTypePicker(false)
                    }}
                  >
                    <View style={styles.vehicleTypeOptionContent}>
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={vehicleTypeId === item.id ? COLORS.primary : COLORS.textSecondary}
                      />
                      <View style={styles.vehicleTypeOptionText}>
                        <Text
                          style={[
                            styles.vehicleTypeOptionName,
                            vehicleTypeId === item.id && styles.vehicleTypeOptionNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.vehicleTypeOptionCapacity}>
                          Hasta {item.maxSeats} pasajeros
                        </Text>
                      </View>
                    </View>
                    {vehicleTypeId === item.id && (
                      <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
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
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Intro Card
  introCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  introIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  introTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textInverse,
    marginBottom: SPACING.xs,
  },
  introText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textInverse + '80',
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface + 'F8', // 97.3% opacidad
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 52,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '99', // Semi-transparente
    ...SHADOWS.md, // Sombra reforzada
    // Luz blanca sutil desde arriba
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    padding: 0,
  },
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
  },

  // Summary Box - estilo premium con dorado
  summaryBox: {
    backgroundColor: COLORS.accentLight + '40', // Dorado con mayor transparencia (25%)
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40', // Borde semi-transparente
    ...SHADOWS.md, // Sombra reforzada
    // Borde superior con color dorado
    borderTopColor: COLORS.accent,
    borderTopWidth: 2.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Info Box
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },

  // Buttons
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.orangeSoft,
    // Sombra profunda adicional
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
    // Bordes blancos para efecto 3D
    borderTopWidth: 2.5,
    borderTopColor: COLORS.shadowWhiteMid,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.shadowWhiteDark,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Vehicle Info Box
  vehicleInfoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  vehicleInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  vehicleInfoLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  vehicleInfoValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  plateBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    letterSpacing: 2,
  },
  vehicleInfoDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Empty Vehicle Box
  emptyVehicleBox: {
    backgroundColor: COLORS.accentLight + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
  },
  emptyVehicleTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptyVehicleText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  editVehicleButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  editVehicleButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textInverse,
    fontWeight: '600',
  },

  // Vehicle Type Selector
  vehicleTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface + 'F8',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    height: 52,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight + '99',
    ...SHADOWS.md,
    borderTopColor: COLORS.shadowWhiteLight,
    borderTopWidth: 1.5,
    borderLeftColor: COLORS.shadowWhiteDark,
    borderLeftWidth: 1,
  },
  vehicleTypeSelectorText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  vehicleTypeInfo: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  vehicleTypeInfoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  vehicleTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  vehicleTypeOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  vehicleTypeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  vehicleTypeOptionText: {
    flex: 1,
  },
  vehicleTypeOptionName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  vehicleTypeOptionNameSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  vehicleTypeOptionCapacity: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
})
