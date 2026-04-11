import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

export default function PrivacyPolicyScreen() {
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
          <Text style={styles.title}>Política de Privacidad</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Última Actualización */}
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Última actualización: Abril 2024</Text>
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Información que Recopilamos</Text>
            <Text style={styles.text}>
              Recopilamos varios tipos de información:

              • Información personal: nombre, email, número de teléfono

              • Información de ubicación en tiempo real durante viajes

              • Datos de vehículos: placa, fabricante, modelo, año

              • Información de pago: datos de tarjetas (procesados de forma segura)

              • Historial de viajes y calificaciones
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Cómo Usamos tu Información</Text>
            <Text style={styles.text}>
              Utilizamos la información que recopilamos para:

              • Proporcionar servicios de transporte

              • Procesar pagos y transacciones

              • Enviar notificaciones sobre tu cuenta

              • Mejorar la seguridad y prevenir fraudes

              • Análisis y mejora del servicio

              • Cumplir con obligaciones legales
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Protección de Datos</Text>
            <Text style={styles.text}>
              • Tus datos se encriptan en tránsito y en reposo

              • Usamos estándares de seguridad de la industria (HTTPS, TLS)

              • El acceso a datos personales está restringido a usuarios autenticados

              • En Supabase usamos políticas de acceso (RLS) para proteger datos de perfiles, mensajes y notificaciones

              • Los datos de ubicación se borran después de cada viaje

              • Realizamos auditorías regulares de seguridad
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Acceso Autenticado</Text>
            <Text style={styles.text}>
              • Solo usuarios validados pueden acceder a su información personal

              • Los perfiles, chat y notificaciones requieren sesión activa

              • No compartimos tus datos de login con terceros no autorizados

              • Tus solicitudes de datos se validan con el servicio de autenticación
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Intercambio de Información</Text>
            <Text style={styles.text}>
              No vendemos ni compartimos tu información personal con terceros, excepto:

              • Proveedores de servicio (procesamiento de pagos, seguridad)

              • Cuando requerido por ley (solicitud legal, investigación criminal)

              • Para proteger la seguridad de nuestros usuarios

              • Conductores y pasajeros solo ven información necesaria para el viaje
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Datos de Ubicación</Text>
            <Text style={styles.text}>
              • La ubicación en tiempo real solo se recopila durante viajes activos

              • Ambos usuarios pueden ver la ubicación uno del otro durante el trayecto

              • Los datos de ubicación se eliminan automáticamente después de 72 horas

              • Puedes deshabilitar la ubicación en cualquier momento en configuración
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Cookies y Tecnologías de Seguimiento</Text>
            <Text style={styles.text}>
              • Utilizamos cookies para mejorar la experiencia del usuario

              • No utilizamos seguimiento publicitario de terceros

              • Puedes controlar las cookies en configuración de tu dispositivo

              • Analytics anónimos ayudan a mejorar nuestro servicio
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Derechos de los Usuarios</Text>
            <Text style={styles.text}>
              Tienes derecho a:

              • Acceder a tu información personal en cualquier momento

              • Corregir información inexacta

              • Solicitar la eliminación de tu cuenta y datos

              • Oponerme al procesamiento de datos

              • Solicitar una copia de tus datos personales
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Retención de Datos</Text>
            <Text style={styles.text}>
              • Los datos de ubicación se retienen por 72 horas

              • El historial de transacciones se retiene por 7 años (requisito fiscal)

              • Los datos de usuario se retienen mientras la cuenta esté activa

              • Después de eliminar tu cuenta, tus datos se borran en 30 días
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Cambios a esta Política</Text>
            <Text style={styles.text}>
              Podemos actualizar esta política de privacidad en cualquier momento. Te notificaremos de cambios importantes a través de la aplicación. Tu uso continuado de Trive constituye aceptación de cambios.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contacto</Text>
            <Text style={styles.text}>
              Si tienes preguntas sobre privacidad:

              📧 Email: soportetrive@gmail.com

              📱 WhatsApp: +57 (300) 577-2967

              ☎️ Teléfono: +57 (317) 302-8628
            </Text>
          </View>

          <View style={styles.disclaimerBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.disclaimerText}>
              Tu privacidad es importante para nosotros. Nos comprometemos a proteger tus datos siguiendo los más altos estándares de seguridad.
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
