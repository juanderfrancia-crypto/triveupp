import React, { memo, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/theme'

interface DateSeparatorProps {
  date: string // formato: "2026-04-15"
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginVertical: SPACING.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  date: {
    marginHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
})

export const DateSeparator = memo(({ date }: DateSeparatorProps) => {
  const formattedDate = useMemo(() => {
    const messageDate = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = messageDate.toDateString() === today.toDateString()
    const isYesterday = messageDate.toDateString() === yesterday.toDateString()

    if (isToday) {
      return 'Hoy'
    } else if (isYesterday) {
      return 'Ayer'
    }

    return messageDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Bogota',
    })
  }, [date])

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.date}>{formattedDate}</Text>
      <View style={styles.line} />
    </View>
  )
})
