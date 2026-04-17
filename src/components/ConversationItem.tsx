import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface ConversationItemProps {
  avatar?: string
  name: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isDriver?: boolean
  isOnline?: boolean
  onPress: () => void
  onDelete?: () => void
}

// Formato de timestamp relativo
const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Ahora'
  if (diffMinutes < 60) return `Hace ${diffMinutes}m`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return date.toLocaleDateString('es-CO', { weekday: 'short' })
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
}

// Preview inteligente del último mensaje
const getMessagePreview = (message: string, maxLength: number = 50): string => {
  if (!message) return 'Sin mensaje'
  if (message.length > maxLength) {
    return message.substring(0, maxLength) + '...'
  }
  return message
}

export const ConversationItem = ({
  avatar,
  name,
  lastMessage,
  lastMessageTime,
  unreadCount,
  isDriver = false,
  isOnline = false,
  onPress,
  onDelete,
}: ConversationItemProps) => {
  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.65}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{getInitial(name)}</Text>
          </View>
        )}

        {/* Indicador en línea */}
        {isOnline && <View style={styles.onlineIndicator} />}

        {/* Badge para conductor */}
        {isDriver && (
          <View style={styles.driverBadge}>
            <Ionicons name="car" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Info del chat */}
      <View style={styles.content}>
        {/* Nombre + Hora */}
        <View style={styles.header}>
          <Text style={[styles.name, unreadCount > 0 && styles.nameUnread]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, unreadCount > 0 && styles.timeUnread]}>
            {formatMessageTime(lastMessageTime)}
          </Text>
        </View>

        {/* Preview + Unread Badge */}
        <View style={styles.footer}>
          <Text
            style={[styles.preview, unreadCount > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {getMessagePreview(lastMessage)}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Botón de opciones (eliminar/archivar) */}
      {onDelete && (
        <TouchableOpacity 
          onPress={onDelete} 
          style={styles.optionsButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAFA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  driverBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  nameUnread: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  timeUnread: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  previewUnread: {
    color: COLORS.dark,
    fontWeight: '500',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    ...SHADOWS.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  optionsButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
