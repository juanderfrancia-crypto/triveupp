import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AudioMessage } from './AudioMessage'

interface ChatBubbleProps {
  message: string
  messageType?: 'text' | 'audio'
  audioUrl?: string
  audioDuration?: number
  isAudioListened?: boolean
  isFromMe: boolean
  timestamp: string
  isRead?: boolean
  onAudioPlay?: () => void
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

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  messageType = 'text',
  audioUrl,
  audioDuration,
  isAudioListened,
  isFromMe,
  timestamp,
  isRead,
  onAudioPlay,
}) => {
  const styles = StyleSheet.create({
    bubbleContainer: {
      flexDirection: 'row',
      marginVertical: 4,
      marginHorizontal: 12,
      justifyContent: isFromMe ? 'flex-end' : 'flex-start',
    },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: isFromMe ? '#007AFF' : '#E5E5EA',
    },
    bubbleText: {
      color: isFromMe ? 'white' : 'black',
      fontSize: 14,
      lineHeight: 20,
    },
    timestamp: {
      alignSelf: isFromMe ? 'flex-end' : 'flex-start',
      marginHorizontal: 12,
      marginTop: 2,
      color: '#999',
      fontSize: 12,
    },
    audioBubble: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      backgroundColor: 'transparent',
    },
  })

  return (
    <View>
      <View style={styles.bubbleContainer}>
        <View style={[styles.bubble, messageType === 'audio' && styles.audioBubble]}>
          {messageType === 'audio' && audioUrl && audioDuration ? (
            <AudioMessage
              audioUrl={audioUrl}
              duration={audioDuration}
              listened={!isAudioListened}
              onPlayComplete={onAudioPlay}
            />
          ) : (
            <Text style={styles.bubbleText}>{message}</Text>
          )}
        </View>
      </View>
      <Text style={styles.timestamp}>{formatTimeAgo(timestamp)}</Text>
    </View>
  )
}
