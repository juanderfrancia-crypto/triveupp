// 🎨 MessageInput.tsx - Input mejorado con contador de caracteres
// Cambios: Counter + barra progreso, better recording UI, visual feedback

import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface MessageInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  onEmojiPress: () => void
  onRecordPress: () => void
  onCancelRecord?: () => void
  onSendAudio?: () => void
  isRecording?: boolean
  isLoading?: boolean
  editingMessageId?: string | null
  sendingMessage?: boolean
  isUploadingAudio?: boolean
  maxLength?: number
}

const MAX_CHARS = 500

export const MessageInput = ({
  value,
  onChangeText,
  onSend,
  onEmojiPress,
  onRecordPress,
  onCancelRecord,
  onSendAudio,
  isRecording = false,
  isLoading = false,
  editingMessageId,
  sendingMessage = false,
  isUploadingAudio = false,
  maxLength = MAX_CHARS,
}: MessageInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const charCount = value.length
  const charPercentage = (charCount / maxLength) * 100

  const getCharCounterColor = () => {
    if (charPercentage >= 90) return COLORS.error
    if (charPercentage >= 70) return COLORS.warning
    return COLORS.textTertiary
  }

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.borderLight,
      backgroundColor: '#FFFFFF',
      ...SHADOWS.sm,
    },

    // ===== EDITING INDICATOR =====
    editingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.sm,
      backgroundColor: '#FFF3CD',
      borderRadius: RADIUS.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.warning,
    },

    editingText: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textPrimary,
      fontWeight: '500',
    },

    // ===== INPUT ROW =====
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACING.sm,
    },

    // ===== BOTÓN EMOJI =====
    emojiButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ===== INPUT WRAPPER =====
    inputWrapper: {
      flex: 1,
      gap: SPACING.xs,
    },

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
      ...SHADOWS.xs,
    },

    // ===== CHARACTER COUNTER =====
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
      minWidth: 50,
    },

    charCounterBar: {
      height: 3,
      flex: 1,
      backgroundColor: COLORS.borderLight,
      borderRadius: 1.5,
      overflow: 'hidden',
    },

    charCounterProgress: {
      height: '100%',
      width: `${charPercentage}%`,
      backgroundColor: getCharCounterColor(),
      borderRadius: 1.5,
    },

    // ===== ACTION BUTTONS =====
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },

    sendButton: {
      backgroundColor: COLORS.primary,
    },

    sendButtonDisabled: {
      opacity: 0.5,
    },

    recordButton: {
      backgroundColor: '#FF3B30',
    },

    editButton: {
      backgroundColor: '#FF9500',
    },

    // ===== RECORDING STATE =====
    recordingContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: '#FEE8E8',
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: '#FF3B30',
      gap: SPACING.sm,
    },

    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF3B30',
      opacity: 0.7,
    },

    recordingText: {
      fontSize: TYPOGRAPHY.size.md,
      fontWeight: '600',
      color: '#FF3B30',
    },

    recordingActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },

    recordConfirmButton: {
      backgroundColor: '#34C759',
    },

    recordCancelButton: {
      backgroundColor: '#888888',
    },
  })

  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={[styles.inputRow]}>
          <View style={styles.recordingContainer}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Grabando...</Text>
          </View>

          <View style={styles.recordingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.recordConfirmButton]}
              onPress={onSendAudio}
              disabled={isUploadingAudio}
            >
              {isUploadingAudio ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.recordCancelButton]}
              onPress={onCancelRecord}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Editing indicator */}
      {editingMessageId && (
        <View style={styles.editingIndicator}>
          <Text style={styles.editingText}>✏️ Editando mensaje...</Text>
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Emoji Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEmojiPress}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="happy" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Input + Counter */}
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
            editable={!isLoading && !isUploadingAudio && !sendingMessage}
          />

          {/* Character Counter + Progress Bar */}
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

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            editingMessageId ? styles.editButton : styles.sendButton,
            (!value.trim() || sendingMessage) && styles.sendButtonDisabled,
          ]}
          onPress={onSend}
          disabled={!value.trim() || sendingMessage || isUploadingAudio}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : editingMessageId ? (
            <Ionicons name="pencil" size={18} color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Record Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.recordButton]}
          onPress={onRecordPress}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="mic" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
