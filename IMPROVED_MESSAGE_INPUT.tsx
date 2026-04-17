// 🎨 Input Message Container - VERSIÓN MEJORADA
// Cambios: Contador caracteres, mejor visual, shadow, feedback

import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface ImprovedInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  onEmojiPress: () => void
  isLoading?: boolean
  maxLength?: number
}

const MAX_CHARS = 500

export const ImprovedMessageInput = ({
  value,
  onChangeText,
  onSend,
  onEmojiPress,
  isLoading = false,
  maxLength = MAX_CHARS,
}: ImprovedInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const charCount = value.length
  const charPercentage = (charCount / maxLength) * 100

  // Cambiar color del contador según uso
  const getCharCounterColor = () => {
    if (charPercentage >= 90) return COLORS.error // Rojo si >90%
    if (charPercentage >= 70) return COLORS.warning // Amarillo si >70%
    return COLORS.textTertiary // Gris normal
  }

  const styles = StyleSheet.create({
    // ===== CONTENEDOR PRINCIPAL =====
    container: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.borderLight,
      alignItems: 'flex-end',
      gap: SPACING.sm,
      backgroundColor: '#FFFFFF',
      // Shadow superior
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 5, // Para Android
    },

    // ===== BOTÓN EMOJI =====
    emojiButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      activeOpacity: 0.8, // Feedback visual
    },

    // ===== ÁREA DEL INPUT =====
    inputWrapper: {
      flex: 1,
      gap: SPACING.xs,
    },

    // INPUT FIELD
    inputField: {
      borderWidth: 1,
      borderColor: isFocused ? COLORS.primary : COLORS.borderLight,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      maxHeight: 100,
      backgroundColor: isFocused ? '#F9FAFB' : COLORS.surfaceAlt,
      fontSize: TYPOGRAPHY.size.md,
      color: COLORS.textPrimary,
      transition: 'all 0.2s' // Animación suave (si React Native lo soporta)
    },

    // CONTADOR DE CARACTERES (DEBAJO DEL INPUT)
    charCounterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.sm,
      gap: SPACING.xs,
    },

    charCounter: {
      fontSize: TYPOGRAPHY.size.xs,
      color: getCharCounterColor(),
      fontWeight: charPercentage >= 70 ? '600' : '400',
    },

    charCounterBar: {
      height: 2,
      flex: 1,
      backgroundColor: COLORS.borderLight,
      borderRadius: 1,
      overflow: 'hidden',
    },

    charCounterProgress: {
      height: '100%',
      width: `${charPercentage}%`,
      backgroundColor: getCharCounterColor(),
    },

    // ===== BOTÓN ENVIAR =====
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: value.trim() ? COLORS.primary : COLORS.textTertiary, // Deshabilitado si vacío
      justifyContent: 'center',
      alignItems: 'center',
      activeOpacity: 0.8,
    },

    sendButtonDisabled: {
      opacity: 0.5,
    },
  })

  return (
    <View style={styles.container}>
      {/* Botón Emoji */}
      <TouchableOpacity
        style={styles.emojiButton}
        onPress={onEmojiPress}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="happy" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Input + Contador */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.inputField}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={COLORS.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          maxLength={maxLength}
          editable={!isLoading}
        />

        {/* Contador de caracteres + barra de progreso */}
        <View style={styles.charCounterContainer}>
          <Text style={styles.charCounter}>
            {charCount}/{maxLength}
          </Text>
          <View style={styles.charCounterBar}>
            <View
              style={[
                styles.charCounterProgress,
                { backgroundColor: getCharCounterColor() },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Botón Enviar */}
      <TouchableOpacity
        style={[styles.sendButton, (!value.trim() || isLoading) && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!value.trim() || isLoading}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        {isLoading ? (
          <Ionicons name="hourglass" size={20} color="#FFFFFF" />
        ) : (
          <Ionicons name="send" size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  )
}

// ===== VARIANTE: Recording State =====
export const RecordingState = ({
  duration,
  onCancel,
  onSend,
}: {
  duration: string
  onCancel: () => void
  onSend: () => void
}) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.borderLight,
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: '#FFF9F9', // Rojo muy claro
      shadowColor: '#FF3B30',
      shadowOpacity: 0.1,
      elevation: 5,
    },

    recordingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
    },

    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#FF3B30',
    },

    recordingText: {
      color: '#FF3B30',
      fontWeight: '600',
      fontSize: TYPOGRAPHY.size.md,
    },

    durationText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.size.md,
      fontWeight: '500',
      marginLeft: SPACING.sm,
    },

    buttons: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },

    cancelButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.textTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FF3B30', // Rojo para grabar
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.recordingIndicator}>
        <View style={styles.recordingDot} />
        <Text style={styles.recordingText}>Grabando...</Text>
        <Text style={styles.durationText}>{duration}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={onSend}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
