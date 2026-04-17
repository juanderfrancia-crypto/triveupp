import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface ReplyBubbleProps {
  originalMessage: string
  originalSenderName: string
  messageType?: 'text' | 'audio'
  onPress?: () => void
  onClear?: () => void
}

export const ReplyBubble = ({
  originalMessage,
  originalSenderName,
  messageType = 'text',
  onPress,
  onClear,
}: ReplyBubbleProps) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Línea azul indicadora */}
      <View style={styles.indicator} />

      {/* Contenido */}
      <View style={styles.content}>
        <Text style={styles.senderName} numberOfLines={1}>
          {originalSenderName}
        </Text>
        <Text
          style={[
            styles.messagePreview,
            messageType === 'audio' && styles.audioPreview,
          ]}
          numberOfLines={2}
        >
          {messageType === 'audio' ? '🎙️ Nota de voz' : originalMessage}
        </Text>
      </View>

      {/* Botón cerrar */}
      {onClear && (
        <TouchableOpacity onPress={onClear} style={styles.closeButton}>
          <Ionicons
            name="close-circle"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  indicator: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  senderName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  messagePreview: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  audioPreview: {
    fontStyle: 'italic',
  },
  closeButton: {
    padding: SPACING.xs,
  },
})
