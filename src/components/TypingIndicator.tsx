import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/theme'

interface TypingIndicatorProps {
  userName?: string
  color?: string
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  userName: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})

export const TypingIndicator = ({ userName = 'Usuario', color = COLORS.primary }: TypingIndicatorProps) => {
  return (
    <View style={styles.container}>
      <View style={[styles.messageBubble, { backgroundColor: '#F0F0F0' }]}>
        <Text style={styles.userName}>{userName} está escribiendo</Text>
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={[styles.dot, { backgroundColor: color, marginLeft: 6, opacity: 0.6 }]} />
          <View style={[styles.dot, { backgroundColor: color, marginLeft: 6, opacity: 0.3 }]} />
        </View>
      </View>
    </View>
  )
}
