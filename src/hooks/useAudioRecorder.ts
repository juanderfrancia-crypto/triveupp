import { Audio } from 'expo-av'
import { useState, useCallback, useRef } from 'react'

export const useAudioRecorder = () => {
  const recordingRef = useRef<Audio.Recording | null>(null)
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
      
      recordingRef.current = rec
      setIsRecording(true)
      setDuration(0)
      
      return true
    } catch (err) {
      console.error('Error starting recording:', err)
      return false
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return null

    try {
      const recording = recordingRef.current
      if (typeof recording.stopAsync === 'function') {
        await recording.stopAsync()
      } else if (typeof recording.stopAndUnloadAsync === 'function') {
        await recording.stopAndUnloadAsync()
      } else {
        throw new Error('El objeto de grabación no soporta stopAsync ni stopAndUnloadAsync')
      }

      const uri = recording.getURI()
      
      // Obtener duración
      const status = await recording.getStatusAsync()
      const durationMs = status.durationMillis || 0
      
      setIsRecording(false)
      setDuration(0)
      recordingRef.current = null

      return { uri, durationMs }
    } catch (err) {
      console.error('Error stopping recording:', err)
      recordingRef.current = null
      return null
    }
  }, [])

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        const recording = recordingRef.current
        if (typeof recording.stopAsync === 'function') {
          await recording.stopAsync()
        } else if (typeof recording.stopAndUnloadAsync === 'function') {
          await recording.stopAndUnloadAsync()
        } else {
          console.warn('El objeto de grabación no soporta stopAsync ni stopAndUnloadAsync')
        }
      } catch (err) {
        console.error('Error cancelling recording:', err)
      }
    }
    setIsRecording(false)
    setDuration(0)
    recordingRef.current = null
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
