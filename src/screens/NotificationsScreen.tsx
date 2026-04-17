import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { useNotifications } from '../hooks/useNotifications'
import { Notification } from '../hooks/useNotifications'

export default function NotificationsScreen() {
  const navigation = useNavigation()
  const { user } = useAppStore()
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications(user?.id)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)

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

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
  }

  const handleToggleNotification = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId)
    }
    setExpandedNotificationId((prev) => (prev === notificationId ? null : notificationId))
  }

  const handleDelete = (notificationId: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta notificación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteNotification(notificationId),
      },
    ])
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking':
        return { name: 'checkmark-circle' as const, color: COLORS.primary }
      case 'trip_update':
        return { name: 'car' as const, color: COLORS.primary }
      case 'driver_arrived':
        return { name: 'navigate' as const, color: COLORS.accent }
      case 'trip_completed':
        return { name: 'flag' as const, color: COLORS.primary }
      case 'review_pending':
        return { name: 'star' as const, color: COLORS.accent }
      case 'message':
        return { name: 'mail' as const, color: COLORS.info }
      default:
        return { name: 'notifications' as const, color: COLORS.primary }
    }
  }

  const getNotificationTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'booking':
        return 'Reserva'
      case 'trip_update':
        return 'Ruta'
      case 'driver_arrived':
        return 'Ruta'
      case 'trip_completed':
        return 'Ruta'
      case 'review_pending':
        return 'Feedback'
      case 'message':
        return 'Chat'
      default:
        return 'General'
    }
  }

  const getNotificationCategoryLabel = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return 'Chat'
      case 'booking':
      case 'trip_update':
      case 'driver_arrived':
      case 'trip_completed':
        return 'Ruta'
      case 'review_pending':
        return 'Feedback'
      default:
        return 'General'
    }
  }

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

    return date.toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getPrettyDataLabel = (key: string) => {
    const map: Record<string, string> = {
      route_id: 'Ruta',
      booking_id: 'Reserva',
      seat_numbers: 'Asientos',
      departure_time: 'Fecha de partida',
      user_id: 'Usuario',
    }
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (chr) => chr.toUpperCase())
  }

  const formatNotificationValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (Array.isArray(value)) return value.join(', ')
    if (key === 'departure_time' || key === 'created_at') {
      const date = new Date(String(value))
      return date.toLocaleString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    return String(value)
  }

  const shouldDisplayDataKey = (key: string) => {
    const hiddenKeys = ['route_id', 'booking_id', 'user_id']
    return !hiddenKeys.includes(key)
  }

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type)
    const isExpanded = expandedNotificationId === item.id

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.notificationUnread]}
        onPress={() => handleToggleNotification(item.id, item.is_read)}
        activeOpacity={0.9}
      >
        <View style={styles.notificationHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: icon.color + '20' }]}> 
            <Ionicons name={icon.name} size={22} color={icon.color} />
          </View>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.textTertiary}
              />
            </View>
            <View style={styles.subtitleRow}>
              <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
              <View style={styles.notificationTypePill}>
                <Text style={styles.notificationTypeText}>{getNotificationTypeLabel(item.type)}</Text>
              </View>
              {!item.is_read && <Text style={styles.notificationBadge}>No leído</Text>}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="close" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notificationBody}>
          <Text style={styles.notificationMessage} numberOfLines={isExpanded ? undefined : 3}>
            {item.message}
          </Text>
          {isExpanded && item.data && Object.keys(item.data).some((key) => shouldDisplayDataKey(key)) && (
            <View style={styles.notificationData}>
              {Object.entries(item.data)
                .filter(([key]) => shouldDisplayDataKey(key))
                .map(([key, value]) => (
                  <View key={key} style={styles.notificationDataRow}>
                    <Text style={styles.notificationDataKey}>{getPrettyDataLabel(key)}:</Text>
                    <Text style={styles.notificationDataValue}>{formatNotificationValue(key, value)}</Text>
                  </View>
                ))}
            </View>
          )}
          <Text style={styles.expandHintText}>{isExpanded ? 'Cerrar' : 'Ver más'}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="notifications-off-outline" size={48} color={COLORS.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>Sin notificaciones</Text>
      <Text style={styles.emptyText}>Las notificaciones aparecerán aquí</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Fondo con círculos decorativos 3D */}
      <View style={styles.bgContainer}>
        <LinearGradient
          colors={[COLORS.primaryLight + '32', COLORS.primary + '16', COLORS.primaryDark + '06']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCircle, styles.gradientCircle1]}
        />
        <LinearGradient
          colors={[COLORS.primaryLight + '25', COLORS.primary + '12', COLORS.primaryDark + '04']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCircle, styles.gradientCircle2]}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllAsRead} activeOpacity={0.8}>
            <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
            <Text style={styles.markAllBtnText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Fondo con círculos decorativos 3D
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  gradientCircle1: {
    top: -100,
    right: -80,
    width: 280,
    height: 280,
  },
  gradientCircle2: {
    top: 150,
    left: -100,
    width: 340,
    height: 340,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  markAllBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Lista
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
    paddingTop: SPACING.md,
  },

  // Notification Card
  notificationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceAlt,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  notificationBody: {
    marginTop: SPACING.sm,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  notificationTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  notificationMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notificationBadge: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '12',
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notificationTypePill: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceAlt,
  },
  notificationTypeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
  },
  markAllBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  expandHintText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 8,
  },
  expandHintText: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  notificationData: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary + '08',
    borderRadius: 14,
  },
  notificationDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  notificationDataKey: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  notificationDataValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
