import { Audio } from 'expo-av'
import { useState, useCallback } from 'react'

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)

  const startRecording = useCallback(async () => {
    try {
      // Pedir permisos
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) {
        console.error('No se otorgaron permisos de audio')
        return false
      }

      // Configurar categoría de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      })

      // Crear y iniciar grabación
      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      await rec.startAsync()
      
      setRecording(rec)
      setIsRecording(true)
      setDuration(0)
      
      return true
    } catch (err) {
      console.error('Error starting recording:', err)
      return false
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!recording) return null

    try {
      await recording.stopAsync()
      const uri = recording.getURI()
      
      // Obtener duración
      const status = await recording.getStatusAsync()
      const durationMs = status.durationMillis || 0
      
      setIsRecording(false)
      setRecording(null)
      setDuration(0)

      return { uri, durationMs }
    } catch (err) {
      console.error('Error stopping recording:', err)
      return null
    }
  }, [recording])

  const cancelRecording = useCallback(async () => {
    if (recording) {
      try {
        await recording.stopAsync()
      } catch (err) {
        console.error('Error cancelling recording:', err)
      }
    }
    setIsRecording(false)
    setRecording(null)
    setDuration(0)
  }, [recording])

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
