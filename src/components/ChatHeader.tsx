import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface ChatHeaderProps {
  name: string
  avatar?: string
  rating?: number
  isDriver?: boolean
  isVerified?: boolean
  isOnline?: boolean
  onBack: () => void
  onProfilePress?: () => void
  onSearchPress?: () => void
  onOptionsPress?: () => void
  vehicleInfo?: {
    model?: string
    plate?: string
  }
}

export const ChatHeader = ({
  name,
  avatar,
  rating = 0,
  isDriver = false,
  isVerified = false,
  isOnline = false,
  onBack,
  onProfilePress,
  onSearchPress,
  onOptionsPress,
  vehicleInfo,
}: ChatHeaderProps) => {
  const [expandedInfo, setExpandedInfo] = useState(false)

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <View style={styles.container}>
      {/* Barra superior con back button y nombre */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerContent}
          onPress={() => {
            setExpandedInfo(!expandedInfo)
            onProfilePress?.()
          }}
          activeOpacity={0.7}
        >
          {/* Avatar pequeño*/}
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarSmall} />
          ) : (
            <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getInitial(name)}</Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {isVerified && <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />}
            </View>

            {/* Estado y rating */}
            <View style={styles.statusRow}>
              {isOnline ? (
                <>
                  <View style={styles.onlineIndicator} />
                  <Text style={styles.statusText}>Activo ahora</Text>
                </>
              ) : (
                <Text style={styles.statusText}>Último visto hace poco</Text>
              )}

              {isDriver && rating > 0 && (
                <>
                  <View style={styles.statusDot} />
                  <Ionicons name="star" size={12} color={COLORS.accent} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Botón de búsqueda */}
        <TouchableOpacity style={styles.actionButton} onPress={onSearchPress}>
          <Ionicons name="search" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Botón para opciones */}
        <TouchableOpacity style={styles.actionButton} onPress={onOptionsPress}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Info expandida del conductor (opcional) */}
      {expandedInfo && isDriver && vehicleInfo && (
        <View style={styles.expandedInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="car" size={18} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Vehículo</Text>
              <Text style={styles.infoValue}>{vehicleInfo.model || 'No especificado'}</Text>
            </View>
          </View>

          {vehicleInfo.plate && (
            <View style={styles.infoRow}>
              <Ionicons name="list" size={18} color={COLORS.primary} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Placa</Text>
                <Text style={styles.infoValue}>{vehicleInfo.plate}</Text>
              </View>
            </View>
          )}

          {isVerified && (
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Conductor verificado</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  name: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  statusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textSecondary,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  actionButton: {
    padding: SPACING.sm,
    marginRight: -SPACING.sm,
  },
  expandedInfo: {
    backgroundColor: COLORS.primary + '08',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
})
