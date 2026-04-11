import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Términos de Servicio</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Última Actualización */}
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Última actualización: Abril 2024</Text>
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Aceptación de Términos</Text>
            <Text style={styles.text}>
              Al descargar, instalar y utilizar la aplicación Trive, aceptas estar vinculado por estos Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no debes usar la aplicación.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Descripción del Servicio</Text>
            <Text style={styles.text}>
              Trive es una plataforma de viajes compartidos que conecta conductores y pasajeros. Facilitamos la comunicación y transacciones entre usuarios, pero no somos responsables de los servicios de transporte en sí.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Requisitos de Uso</Text>
            <Text style={styles.text}>
              • Debes tener al menos 18 años para usar Trive

              • Debes proporcionar información exacta y completa

              • Eres responsable de mantener la confidencialidad de tu cuenta

              • Aceptas usar la aplicación solo para propósitos legales
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Conductores</Text>
            <Text style={styles.text}>
              Si ofreces servicios de transporte a través de Trive:

              • Debes poseer una licencia de conducir válida

              • Tu vehículo debe cumplir con estándares de seguridad

              • Debes tener seguro de responsabilidad civil válido

              • Estás sujeto a verificaciones de antecedentes

              • Eres responsable de la seguridad de tus pasajeros
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Pasajeros</Text>
            <Text style={styles.text}>
              Si utilizas servicios de transporte a través de Trive:

              • Debes proporcionar una dirección exacta

              • Debes respetar las políticas de cancelación

              • Eres responsable de tu comportamiento durante el viaje

              • Debes respetar el código de conducta de Trive
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Pagos y Facturación</Text>
            <Text style={styles.text}>
              • Los pagos se procesan a través de proveedores terceros seguros

              • Todos los precios incluyen impuestos aplicables

              • Trive se reserva el derecho de cambiar precios con notificación previa

              • Los reembolsos se procesarán de acuerdo con nuestra política
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Seguridad y Protección de Datos</Text>
            <Text style={styles.text}>
              • Tu cuenta está protegida por autenticación de Supabase y tokens seguros

              • No compartas tus credenciales con nadie

              • Solo usuarios autenticados pueden acceder a viajes, mensajes y pagos

              • Protegemos tus datos de pago y personales con medidas técnicas y de políticas internas
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Cancelaciones</Text>
            <Text style={styles.text}>
              • Las cancelaciones gratuitas están disponibles dentro de 5 minutos de la confirmación

              • Las cancelaciones después de este período pueden estar sujetas a cargos

              • Los conductores pueden cancelar en caso de emergencia

              • Trive puede cancelar servicios que violen nuestros términos
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Comportamiento y Código de Conducta</Text>
            <Text style={styles.text}>
              Se espera que todos los usuarios:

              • Traten a otros usuarios con respeto

              • No particen en acoso, discriminación o violencia

              • Sigan las leyes de tránsito

              • Mantengan la limpieza de los vehículos

              • No realicen actividades ilegales
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Limitación de Responsabilidad</Text>
            <Text style={styles.text}>
              Trive no es responsable por:

              • Daños indirectos o consecuentes

              • Lesiones o daños durante el viaje

              • Pérdida de datos o información

              • Interrupción del servicio

              • Acciones de terceros
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Modificaciones de Términos</Text>
            <Text style={styles.text}>
              Trive se reserva el derecho de modificar estos términos en cualquier momento. Los cambios se comunicarán a través de la aplicación. El uso continuado de Trive constituye aceptación de los términos modificados.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Terminación</Text>
            <Text style={styles.text}>
              Podemos suspender o terminar tu acceso a Trive en cualquier momento si violás estos términos o por razones de seguridad. Puedes eliminar tu cuenta en cualquier momento a través de configuración.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Contacto</Text>
            <Text style={styles.text}>
              Si tienes preguntas sobre estos Términos de Servicio, contáctanos en:

              📧 Email: soportetrive@gmail.com

              📱 WhatsApp: +57 (300) 577-2967

              ☎️ Teléfono: +57 (317) 302-8628
            </Text>
          </View>

          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.disclaimerText}>
              Estos Términos de Servicio constituyen el acuerdo completo entre tú y Trive. Si alguna disposición es inválida, las disposiciones restantes continuarán en vigor.
            </Text>
          </View>
        </View>
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
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  lastUpdated: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  text: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  disclaimerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 18,
  },
})
