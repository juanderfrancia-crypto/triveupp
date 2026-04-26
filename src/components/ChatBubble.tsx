import React, { memo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { AudioMessage } from './AudioMessage'
import { EmojiReactions } from './EmojiReactions'

interface ChatBubbleProps {
  message: string
  messageType?: 'text' | 'audio'
  audioUrl?: string
  audioDuration?: number
  isAudioListened?: boolean
  isFromMe: boolean
  timestamp: string
  isRead?: boolean
  isEdited?: boolean
  isPinned?: boolean
  onAudioPlay?: () => void
  onCopy?: () => void
  onDelete?: () => void
  onReact?: (emoji: string) => void
  onReply?: () => void
  onEdit?: () => void
  onPin?: () => void
  onUnpin?: () => void
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>
  currentUserId?: string
}

// Función para formatear hora HH:MM
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  })
}

// Función simple para formatear distancia de tiempo
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'hace unos segundos'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`
  return `hace ${Math.floor(seconds / 86400)}d`
}

export const ChatBubble: React.FC<ChatBubbleProps> = memo(({
  message,
  messageType = 'text',
  audioUrl,
  audioDuration,
  isAudioListened,
  isFromMe,
  timestamp,
  isRead,
  isEdited,
  isPinned,
  onAudioPlay,
  onCopy,
  onDelete,
  onReact,
  onReply,
  onEdit,
  onPin,
  onUnpin,
  reactions = [],
  currentUserId,
}) => {
  const [showMenu, setShowMenu] = useState(false)

  const containerStyle = [
    baseStyles.container,
    isFromMe ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const },
  ]
  const bubbleWrapperStyle = [
    baseStyles.bubbleWrapper,
    isFromMe ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const },
  ]
  const bubbleStyle = [
    baseStyles.bubble,
    messageType === 'audio' && baseStyles.audioBubble,
    { backgroundColor: isFromMe ? COLORS.primary : '#D8D8D8' },
  ]
  const bubbleTextStyle = [
    baseStyles.bubbleText,
    !isFromMe && { color: COLORS.textPrimary },
    message === '[Mensaje eliminado]' && baseStyles.deletedText,
  ]

  return (
    <View style={{ flex: 0, overflow: 'visible', position: 'relative' }}>
      {/* Overlay para cerrar menú */}
      {showMenu && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: -9999, right: -9999, bottom: -9999, zIndex: 998 }}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        />
      )}

      <View style={containerStyle}>
        <TouchableOpacity 
          style={baseStyles.moreButton} 
          onPress={() => setShowMenu(!showMenu)}
          disabled={message === '[Mensaje eliminado]'}
          activeOpacity={0.6}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={bubbleWrapperStyle}>
          <View style={bubbleStyle}>
            {messageType === 'audio' && audioUrl && audioDuration ? (
              <AudioMessage
                audioUrl={audioUrl}
                duration={audioDuration}
                listened={!isAudioListened}
                onPlayComplete={onAudioPlay}
              />
            ) : (
              <Text style={bubbleTextStyle}>
                {message}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Footer con timestamp y estado de lectura - FUERA de la burbuja */}
      <View style={[baseStyles.messageFooter, { marginHorizontal: SPACING.md }]}>
        <Text style={baseStyles.timestamp}>{formatTime(timestamp)}</Text>
        {isFromMe && (
          <Text style={[baseStyles.readStatus, { color: isRead ? COLORS.primary : COLORS.textSecondary }]}>
            {isRead ? '✓✓' : '✓'}
          </Text>
        )}
      </View>

      {/* Menú flotante - posicionado correctamente */}
      {showMenu && message !== '[Mensaje eliminado]' && (
        <View style={{ position: 'absolute', right: isFromMe ? 35 : undefined, left: isFromMe ? undefined : 35, top: -8, backgroundColor: 'white', borderRadius: 8, padding: 4, ...SHADOWS.md, minWidth: 210, zIndex: 10000, maxHeight: 400 }}>
          {/* ÚNICAMENTE PARA MENSAJES DE OTROS USUARIOS: Reply */}
          {!isFromMe && onReply && (
            <TouchableOpacity
              onPress={() => {
                onReply()
                setShowMenu(false)
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
            >
              <Ionicons name="arrow-undo" size={16} color={COLORS.primary} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: COLORS.textPrimary }}>Responder</Text>
            </TouchableOpacity>
          )}

          {/* PARA TODOS: Copiar */}
          {onCopy && (
            <TouchableOpacity
              onPress={() => {
                onCopy()
                setShowMenu(false)
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
            >
              <Ionicons name="copy" size={16} color={COLORS.primary} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: COLORS.textPrimary }}>Copiar</Text>
            </TouchableOpacity>
          )}

          {/* PIN/UNPIN */}
          {onPin && !isPinned && (
            <TouchableOpacity
              onPress={() => {
                onPin()
                setShowMenu(false)
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
            >
              <Ionicons name="pin" size={16} color={COLORS.primary} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: COLORS.textPrimary }}>Fijar</Text>
            </TouchableOpacity>
          )}

          {onUnpin && isPinned && (
            <TouchableOpacity
              onPress={() => {
                onUnpin()
                setShowMenu(false)
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
            >
              <Ionicons name="pin" size={16} color={COLORS.textSecondary} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: COLORS.textSecondary }}>Desfijar</Text>
            </TouchableOpacity>
          )}

          {/* EDIT (solo para mis mensajes) */}
          {isFromMe && onEdit && (
            <TouchableOpacity
              onPress={() => {
                onEdit()
                setShowMenu(false)
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
            >
              <Ionicons name="pencil" size={16} color={COLORS.primary} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: COLORS.textPrimary }}>Editar</Text>
            </TouchableOpacity>
          )}

          {/* DELETE (solo para mis mensajes) */}
          {isFromMe && onDelete && (
            <TouchableOpacity
              onPress={() => {
                onDelete()
                setShowMenu(false)
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="trash" size={16} color={COLORS.error} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: COLORS.error }}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reacciones con emoji */}
      {reactions.length > 0 && (
        <View style={{ marginHorizontal: SPACING.md, marginTop: SPACING.xs }}>
          <EmojiReactions
            reactions={reactions}
            canReact={!!onReact}
            onToggleReaction={onReact ? (emoji) => onReact(emoji) : undefined}
          />
        </View>
      )}
    </View>
  )
}, (prevProps, nextProps) => (
  prevProps.message === nextProps.message &&
  prevProps.messageType === nextProps.messageType &&
  prevProps.audioUrl === nextProps.audioUrl &&
  prevProps.audioDuration === nextProps.audioDuration &&
  prevProps.isAudioListened === nextProps.isAudioListened &&
  prevProps.isFromMe === nextProps.isFromMe &&
  prevProps.timestamp === nextProps.timestamp &&
  prevProps.isRead === nextProps.isRead &&
  prevProps.isEdited === nextProps.isEdited &&
  prevProps.isPinned === nextProps.isPinned &&
  prevProps.onAudioPlay === nextProps.onAudioPlay &&
  prevProps.onCopy === nextProps.onCopy &&
  prevProps.onDelete === nextProps.onDelete &&
  prevProps.onReply === nextProps.onReply &&
  prevProps.onEdit === nextProps.onEdit &&
  prevProps.onPin === nextProps.onPin &&
  prevProps.onUnpin === nextProps.onUnpin &&
  JSON.stringify(prevProps.reactions) === JSON.stringify(nextProps.reactions) &&
  prevProps.currentUserId === nextProps.currentUserId
))

const baseStyles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.md,
    alignItems: 'flex-end',
    gap: SPACING.xs,
    overflow: 'visible',
    position: 'relative',
  },
  bubbleWrapper: {
    flex: 1,
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    ...SHADOWS.sm,
  },
  bubbleText: {
    fontSize: TYPOGRAPHY.size.md,
    lineHeight: 20,
  },
  deletedText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.size.md,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
    paddingHorizontal: SPACING.sm,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
  },
  readStatus: {
    fontSize: 10,
  },
  audioBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  moreButton: {
    padding: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.md,
    flexWrap: 'wrap',
    maxWidth: '85%',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.xs,
  },
  reaction: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 14,
  },
})
