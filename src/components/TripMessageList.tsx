import React from 'react'
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native'
import { TripMessage } from '../services/trip_messages'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface TripMessageListProps {
  messages: TripMessage[]
  userId: string
  loading?: boolean
}

/**
 * Componente para mostrar los mensajes de un viaje
 * Simple, sin audio ni emojis - solo texto puro
 */
export const TripMessageList = React.memo(({ messages, userId, loading }: TripMessageListProps) => {
  const renderMessage = ({ item }: { item: TripMessage }) => {
    const isFromMe = item.from_user_id === userId
    const timestamp = new Date(item.created_at).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <View
        style={[
          styles.messageBubble,
          isFromMe ? styles.messageBubbleMe : styles.messageBubbleThem,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isFromMe ? styles.messageTextMe : styles.messageTextThem,
          ]}
        >
          {item.message}
        </Text>
        <Text
          style={[
            styles.timestamp,
            isFromMe ? styles.timestampMe : styles.timestampThem,
          ]}
        >
          {timestamp}
          {isFromMe && item.is_read && ' ✓✓'}
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando mensajes...</Text>
      </View>
    )
  }

  if (messages.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Sin mensajes aún</Text>
        <Text style={styles.emptySubtext}>Envía el primer mensaje</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.messagesList}
      onContentSizeChange={() => {}}
    />
  )
})

TripMessageList.displayName = 'TripMessageList'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  messagesList: {
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.disabled,
  },
  messageBubble: {
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.md,
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    marginRight: SPACING.md,
  },
  messageBubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background.secondary,
    marginLeft: SPACING.md,
  },
  messageText: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
  },
  messageTextMe: {
    color: COLORS.white,
  },
  messageTextThem: {
    color: COLORS.text.primary,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
  timestampMe: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  timestampThem: {
    color: COLORS.text.secondary,
    textAlign: 'left',
  },
})
