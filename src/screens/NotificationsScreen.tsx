import { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useNotifications } from '../hooks/useNotifications'
import { Notification } from '../hooks/useNotifications'

type NotificationCategory = 'all' | 'chat' | 'ruta' | 'feedback' | 'booking'

interface NotificationWithSender extends Notification {
  senderName?: string
  senderType?: 'system' | 'user'
}

export default function NotificationsScreen() {
  const navigation = useNavigation()
  const { user } = useAppStore()
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications(user?.id)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  // Obtener nombre del remitente basado en datos
  const getNotificationWithSender = (notif: Notification): NotificationWithSender => {
    let senderName = 'Sistema'
    let senderType: 'system' | 'user' = 'system'

    // Si el mensaje tiene sender_id en data, es de otro usuario
    if (notif.data?.sender_id && typeof notif.data.sender_id === 'string') {
      senderName = notif.data.sender_name || 'Usuario'
      senderType = 'user'
    } else if (notif.data?.from_user_name) {
      senderName = notif.data.from_user_name
      senderType = 'user'
    }

    return { ...notif, senderName, senderType }
  }

  // Filtrar notificaciones por categoría
  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'all') return notifications.map(getNotificationWithSender)

    return notifications
      .filter((notif) => {
        if (selectedCategory === 'chat') return notif.type === 'message'
        if (selectedCategory === 'ruta')
          return ['trip_update', 'driver_arrived', 'trip_completed', 'booking'].includes(notif.type)
        if (selectedCategory === 'feedback') return notif.type === 'review_pending'
        if (selectedCategory === 'booking') return notif.type === 'booking'
        return true
      })
      .map(getNotificationWithSender)
  }, [notifications, selectedCategory])

  // Obtener color e icono por tipo
  const getCategoryStyle = (type: Notification['type']) => {
    const styles: Record<
      string,
      { color: string; bgColor: string; icon: string; category: string }
    > = {
      message: { color: '#007AFF', bgColor: '#007AFF15', icon: 'chatbubble', category: 'Chat' },
      trip_update: {
        color: '#34C759',
        bgColor: '#34C75915',
        icon: 'navigate-outline',
        category: 'Ruta',
      },
      driver_arrived: { color: '#34C759', bgColor: '#34C75915', icon: 'pin', category: 'Ruta' },
      trip_completed: { color: '#34C759', bgColor: '#34C75915', icon: 'checkmark-circle', category: 'Ruta' },
      booking: { color: '#AF52DE', bgColor: '#AF52DE15', icon: 'checkmark', category: 'Reserva' },
      review_pending: { color: '#FF9500', bgColor: '#FF950015', icon: 'star', category: 'Feedback' },
    }
    return styles[type] || styles['message']
  }

  // Preview inteligente del contenido
  const getMessagePreview = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength).trim() + '...'
  }

  // Formato de fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`

    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
  }

  // Componente de tarjeta de notificación
  const NotificationCard = ({ item }: { item: NotificationWithSender }) => {
    const style = getCategoryStyle(item.type)
    const isExpanded = expandedId === item.id
    const isUnread = !item.is_read

    return (
      <TouchableOpacity
        style={[
          styleSheet.notificationCard,
          isUnread && styleSheet.notificationCardUnread,
          isExpanded && styleSheet.notificationCardExpanded,
        ]}
        onPress={() => {
          if (isUnread) markAsRead(item.id)
          setExpandedId(isExpanded ? null : item.id)
        }}
        activeOpacity={0.8}
      >
        {/* Indicador de no leído */}
        {isUnread && <View style={styleSheet.unreadIndicator} />}

        {/* Encabezado con icono y categoría */}
        <View style={styleSheet.cardHeader}>
          <View style={[styleSheet.iconContainer, { backgroundColor: style.bgColor }]}>
            <Ionicons name={style.icon as any} size={20} color={style.color} />
          </View>

          <View style={styleSheet.headerContent}>
            <View style={styleSheet.titleRow}>
              <Text style={styleSheet.categoryBadge} numberOfLines={1}>
                {style.category}
              </Text>
              {isUnread && <View style={styleSheet.readDot} />}
            </View>

            <Text style={styleSheet.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>

            {/* Quién envió */}
            <View style={styleSheet.senderRow}>
              <Text style={styleSheet.senderLabel}>De:</Text>
              <Text style={[styleSheet.senderName, { color: style.color }]} numberOfLines={1}>
                {item.senderName}
              </Text>
            </View>
          </View>

          {/* Botón eliminar */}
          <TouchableOpacity
            style={styleSheet.deleteButton}
            onPress={() => {
              Alert.alert('Eliminar', '¿Eliminar esta notificación?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => deleteNotification(item.id),
                },
              ])
            }}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Preview del mensaje */}
        <View style={styleSheet.messagePreview}>
          <Text style={styleSheet.previewText} numberOfLines={isExpanded ? undefined : 2}>
            "{getMessagePreview(item.message)}"
          </Text>
        </View>

        {/* Footer con tiempo */}
        <View style={styleSheet.cardFooter}>
          <Text style={styleSheet.timeText}>{formatDate(item.created_at)}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.textTertiary}
          />
        </View>

        {/* Detalles expandidos */}
        {isExpanded && item.data && (
          <View style={styleSheet.expandedDetails}>
            {Object.entries(item.data)
              .filter(([key]) => !['sender_id', 'sender_name', 'from_user_name'].includes(key))
              .slice(0, 4)
              .map(([key, value]) => (
                <View key={key} style={styleSheet.detailRow}>
                  <Text style={styleSheet.detailKey}>
                    {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}:
                  </Text>
                  <Text style={styleSheet.detailValue}>{String(value).substring(0, 40)}</Text>
                </View>
              ))}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // Filtros por categoría
  const CategoryFilter = () => {
    const categories: { id: NotificationCategory; label: string; icon: string }[] = [
      { id: 'all', label: 'Todas', icon: 'list' },
      { id: 'chat', label: 'Chat', icon: 'chatbubble' },
      { id: 'ruta', label: 'Ruta', icon: 'navigate' },
      { id: 'feedback', label: 'Feedback', icon: 'star' },
      { id: 'booking', label: 'Reserva', icon: 'checkmark' },
    ]

    return (
      <View style={styleSheet.filterContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styleSheet.filterButton,
              selectedCategory === cat.id && styleSheet.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={selectedCategory === cat.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styleSheet.filterText,
                selectedCategory === cat.id && styleSheet.filterTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  // Empty State
  const EmptyState = () => (
    <View style={styleSheet.emptyContainer}>
      <View style={styleSheet.emptyIconWrapper}>
        <Ionicons name="notifications-off-outline" size={56} color={COLORS.textTertiary} />
      </View>
      <Text style={styleSheet.emptyTitle}>Sin notificaciones</Text>
      <Text style={styleSheet.emptySubtitle}>
        {selectedCategory === 'all'
          ? 'Las notificaciones aparecerán aquí'
          : `Sin notificaciones en ${selectedCategory}`}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styleSheet.safeContainer} edges={['top', 'left', 'right']}>
      {/* Encabezado */}
      <View style={styleSheet.header}>
        <TouchableOpacity
          style={styleSheet.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styleSheet.headerTitle}>
          <Text style={styleSheet.title}>Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styleSheet.badge}>
              <Text style={styleSheet.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styleSheet.markAllButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <CategoryFilter />

      {/* Lista */}
      {loading && !refreshing ? (
        <View style={styleSheet.loadingContainer}>
          <Ionicons name="hourglass-outline" size={40} color={COLORS.textTertiary} />
          <Text style={styleSheet.loadingText}>Cargando notificaciones...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={(props) => <NotificationCard {...props} />}
          contentContainerStyle={styleSheet.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styleSheet = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: '#fff',
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filtros
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Lista
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
    gap: SPACING.md,
  },

  // Tarjeta de notificación
  notificationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  notificationCardUnread: {
    backgroundColor: COLORS.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationCardExpanded: {
    borderColor: COLORS.primary,
  },

  unreadIndicator: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerContent: {
    flex: 1,
    gap: SPACING.xs,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  categoryBadge: {
    ...TYPOGRAPHY.label,
    fontWeight: '700',
    color: COLORS.primary,
  },

  readDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },

  notificationTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  senderLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },

  senderName: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  deleteButton: {
    padding: SPACING.sm,
    marginTop: -SPACING.sm,
  },

  messagePreview: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary + '30',
  },

  previewText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },

  expandedDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  detailKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },

  detailValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },

  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },

  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },

  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
})
