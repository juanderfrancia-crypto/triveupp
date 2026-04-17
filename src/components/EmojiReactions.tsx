import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface ReactionData {
  emoji: string
  count: number
  userReacted: boolean
}

interface EmojiReactionsProps {
  reactions?: ReactionData[]
  onAddReaction?: () => void
  onToggleReaction?: (emoji: string) => void
  canReact?: boolean
}

export const EmojiReactions = ({
  reactions = [],
  onAddReaction,
  onToggleReaction,
  canReact = true,
}: EmojiReactionsProps) => {
  // Validar y filtrar reacciones válidas
  const validReactions = (reactions || []).filter(
    r => r && r.emoji && typeof r.count === 'number' && r.count > 0
  )

  if (validReactions.length === 0 && !canReact) {
    return null
  }

  return (
    <View style={styles.container}>
      {validReactions.map((reaction, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.reactionButton,
            reaction.userReacted && styles.reactionButtonActive,
          ]}
          onPress={() => onToggleReaction?.(reaction.emoji)}
        >
          <Text style={styles.emoji}>{reaction.emoji}</Text>
          <Text
            style={[
              styles.count,
              reaction.userReacted && styles.countActive,
            ]}
          >
            {String(reaction.count)}
          </Text>
        </TouchableOpacity>
      ))}

      {canReact && (
        <TouchableOpacity style={styles.addButton} onPress={onAddReaction}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.xs,
  },
  reactionButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  emoji: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 20,
  },
  count: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  countActive: {
    color: COLORS.primary,
  },
  addButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
