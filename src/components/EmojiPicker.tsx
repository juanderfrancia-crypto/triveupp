import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, Text, Dimensions } from 'react-native'
import { SPACING, RADIUS, COLORS, TYPOGRAPHY } from '../theme/theme'
import { Ionicons } from '@expo/vector-icons'

interface EmojiPickerProps {
  visible: boolean
  onSelectEmoji: (emoji: string) => void
  onClose: () => void
}

const EMOJI_CATEGORIES = {
  smileys: {
    label: '😊',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🥱', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤮', '🤢', '🤮', '🤮', '🤮']
  },
  hearts: {
    label: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙']
  },
  hand: {
    label: '👋',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🫴', '🫲']
  },
  activities: {
    label: '🎉',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🥅', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎯', '🎮', '🎲', '♠️', '♥️', '♦️', '♣️', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸']
  },
  food: {
    label: '🍎',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍆', '🍅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧀', '🍗', '🥩', '🍗', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🍢', '🍱', '🍝', '🍜', '🍲', '🍛', '🍣', '🍣', '🍤', '🍥', '🥠', '🥮', '🍶', '🍵', '☕', '🍶']
  },
  nature: {
    label: '🌻',
    emojis: ['🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🎍', '🎎', '🎏', '🎋', '🍃', '🍂', '🍁', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️']
  }
}

export const EmojiPicker = ({ visible, onSelectEmoji, onClose }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys')
  const { height } = Dimensions.get('window')

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.container, { maxHeight: height * 0.6 }]}>
          {/* Botón cerrar */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Selecciona un emoji</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Grid de emojis */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.emojiGrid}
          >
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiButton}
                onPress={() => {
                  onSelectEmoji(emoji)
                  onClose()
                }}
              >
                <Text style={styles.emojiDisplay}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Categorías */}
          <View style={styles.categoryBar}>
            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryButton,
                  activeCategory === key && styles.categoryButtonActive,
                ]}
                onPress={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
              >
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  emojiButton: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emojiDisplay: {
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 28,
    color: '#000000',
  },
  categoryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary + '20',
  },
  categoryLabel: {
    fontSize: 18,
  },
})
