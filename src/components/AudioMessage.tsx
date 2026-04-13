import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Audio } from 'expo-av'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'

interface AudioMessageProps {
  audioUrl: string
  duration: number
  listened: boolean
  onPlayComplete?: () => void
}

export const AudioMessage = ({
  audioUrl,
  duration,
  listened,
  onPlayComplete,
}: AudioMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const playAudio = async () => {
    if (isPlaying && sound) {
      await sound.pauseAsync()
      setIsPlaying(false)
      return
    }

    try {
      setIsLoading(true)

      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false }
        )
        
        // Listener para actualizaciones
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isPlaying) {
            setPosition(status.positionMillis || 0)
          }
          if (status.didJustFinish) {
            setIsPlaying(false)
            setPosition(0)
            onPlayComplete?.()
          }
        })

        setSound(newSound)
        await newSound.playAsync()
      } else {
        await sound.playAsync()
      }

      setIsPlaying(true)
    } catch (err) {
      console.error('Error playing audio:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const pauseAudio = async () => {
    if (sound && isPlaying) {
      await sound.pauseAsync()
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync()
      }
    }
  }, [sound])

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      minWidth: 150,
    },
    playButton: {
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timeText: {
      fontSize: 12,
      color: '#666',
      flex: 1,
    },
    unreadIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#007AFF',
      marginLeft: 8,
    },
  })

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={isPlaying ? pauseAudio : playAudio}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={32}
            color="#007AFF"
          />
        )}
      </TouchableOpacity>

      <Text style={styles.timeText}>
        {isPlaying
          ? `${(position / 1000).toFixed(1)}s / ${(duration / 1000).toFixed(1)}s`
          : `${(duration / 1000).toFixed(1)}s`}
      </Text>

      {!listened && <View style={styles.unreadIndicator} />}
    </View>
  )
}
