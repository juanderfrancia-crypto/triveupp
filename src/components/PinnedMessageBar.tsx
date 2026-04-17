import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface PinnedMessage {
  id: string
  message: string
  senderName: string
  createdAt: string
}

interface PinnedMessageBarProps {
  pinnedMessages: PinnedMessage[]
  onMessagePress: (messageId: string) => void
  onUnpin?: (messageId: string) => void
}

export const PinnedMessageBar = ({
  pinnedMessages,
  onMessagePress,
  onUnpin,
}: PinnedMessageBarProps) => {
  const [showModal, setShowModal] = useState(false)

  if (pinnedMessages.length === 0) {
    return null
  }

  const currentMessage = pinnedMessages[0]

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => {
          if (pinnedMessages.length > 1) {
            setShowModal(true)
          } else {
            onMessagePress(currentMessage.id)
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="pin" size={14} color={COLORS.primary} />
            <Text style={styles.title}>Fijado</Text>
            {pinnedMessages.length > 1 && (
              <Text style={styles.count}>{pinnedMessages.length}</Text>
            )}
          </View>
          <Text style={styles.message} numberOfLines={1}>
            {currentMessage.message}
          </Text>
          <Text style={styles.sender} numberOfLines={1}>
            — {currentMessage.senderName}
          </Text>
        </View>

        <View style={styles.actions}>
          {onUnpin && (
            <TouchableOpacity
              onPress={() => onUnpin(currentMessage.id)}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          {pinnedMessages.length > 1 && (
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={styles.iconButton}
            >
              <Ionicons
                name="chevron-down"
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Modal con todos los mensajes fijados */}
      <Modal
        transparent
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Mensajes fijados ({pinnedMessages.length})
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={pinnedMessages}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.pinnedItem}
                  onPress={() => {
                    onMessagePress(item.id)
                    setShowModal(false)
                  }}
                >
                  <View style={styles.pinnedItemContent}>
                    <View style={styles.pinnedItemNumber}>
                      <Text style={styles.pinnedItemNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.pinnedItemText}>
                      <Text style={styles.pinnedItemSender} numberOfLines={1}>
                        {item.senderName}
                      </Text>
                      <Text
                        style={styles.pinnedItemMessage}
                        numberOfLines={2}
                      >
                        {item.message}
                      </Text>
                    </View>
                  </View>
                  {onUnpin && (
                    <TouchableOpacity
                      onPress={() => {
                        onUnpin(item.id)
                      }}
                      style={styles.unpinButton}
                    >
                      <Ionicons
                        name="trash"
                        size={16}
                        color={COLORS.error}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  message: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  sender: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '80%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pinnedItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  pinnedItemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedItemNumberText: {
    color: 'white',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.size.xs,
  },
  pinnedItemText: {
    flex: 1,
  },
  pinnedItemSender: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pinnedItemMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unpinButton: {
    padding: SPACING.sm,
  },
})
