// 🎨 ChatBubble.tsx - VERSIÓN MEJORADA
// Cambios: Timestamps AFUERA, mejor checkmarks, reacciones más visibles

import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface ChatBubbleProps {
  message: string
  messageType?: 'text' | 'audio'
  isFromMe: boolean
  timestamp: string
  isRead?: boolean
  isEdited?: boolean
  reactions?: { [key: string]: number }
  onDelete?: () => void
  onReact?: (emoji: string) => void
  onReply?: () => void
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const ChatBubbleImproved: React.FC<ChatBubbleProps> = ({
  message,
  messageType = 'text',
  isFromMe,
  timestamp,
  isRead,
  isEdited,
  reactions = {},
  onDelete,
  onReact,
  onReply,
}) => {
  const [showMenu, setShowMenu] = useState(false)

  const styles = StyleSheet.create({
    // ===== CONTENEDOR PRINCIPAL =====
    messageContainer: {
      marginVertical: SPACING.xs,
      marginHorizontal: SPACING.md,
      alignItems: isFromMe ? 'flex-end' : 'flex-start',
    },

    // ===== BURBUJA =====
    bubbleWrapper: {
      maxWidth: '85%',
      backgroundColor: isFromMe ? COLORS.primary : '#D8D8D8', // Gris MÁS oscuro
      borderRadius: 16,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      ...SHADOWS.sm, // Sombra sutil
    },

    bubbleText: {
      color: isFromMe ? '#FFFFFF' : COLORS.textPrimary,
      fontSize: TYPOGRAPHY.size.md,
      lineHeight: 20,
    },

    // ===== FOOTER (FUERA DE LA BURBUJA) =====
    footerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      marginTop: SPACING.xs,
      paddingHorizontal: SPACING.sm,
    },

    timestampBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    timestamp: {
      fontSize: TYPOGRAPHY.size.xs,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },

    checkmark: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontWeight: '700',
      marginLeft: 2,
    },

    checkmarkRead: {
      color: COLORS.primary, // Azul cuando está leído
      fontSize: 13,
    },

    editedLabel: {
      fontSize: 11,
      color: COLORS.textTertiary,
      fontStyle: 'italic',
      marginLeft: 4,
    },

    // ===== REACCIONES =====
    reactionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: SPACING.xs,
      maxWidth: '85%',
    },

    reactionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surfaceHover,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: COLORS.borderLight,
      gap: 2,
    },

    reactionEmoji: {
      fontSize: 14,
    },

    reactionCount: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontWeight: '600',
    },

    // ===== MENÚ DE OPCIONES =====
    menuContainer: {
      position: 'absolute',
      top: -100,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOWS.lg,
    },

    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderLight,
      gap: SPACING.sm,
    },

    menuItemText: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textPrimary,
      fontWeight: '500',
    },

    deleteMenuItemText: {
      color: COLORS.error,
    },
  })

  return (
    <View style={styles.messageContainer}>
      {/* Burbuja principal */}
      <TouchableOpacity
        style={styles.bubbleWrapper}
        onLongPress={() => setShowMenu(!showMenu)}
        delayLongPress={500}
      >
        <Text style={styles.bubbleText}>{message}</Text>
      </TouchableOpacity>

      {/* Reacciones (debajo) */}
      {Object.keys(reactions).length > 0 && (
        <View style={styles.reactionsContainer}>
          {Object.entries(reactions).map(([emoji, count]) => (
            <View key={emoji} style={styles.reactionBadge}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer (timestamp + checkmark + edited) */}
      <View style={styles.footerContainer}>
        <View style={styles.timestampBadge}>
          <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
          {isFromMe && (
            <Text style={[styles.checkmark, isRead && styles.checkmarkRead]}>
              {isRead ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
        {isEdited && <Text style={styles.editedLabel}>(editado)</Text>}
      </View>

      {/* Menú contextual */}
      {showMenu && (
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={onReply}>
            <Ionicons name="arrow-undo" size={16} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Responder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Clipboard.setString(message)
              Alert.alert('Copiado', 'Mensaje copiado al portapapeles')
              setShowMenu(false)
            }}
          >
            <Ionicons name="copy" size={16} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Copiar</Text>
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={onDelete}>
              <Ionicons name="trash" size={16} color={COLORS.error} />
              <Text style={[styles.menuItemText, styles.deleteMenuItemText]}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
