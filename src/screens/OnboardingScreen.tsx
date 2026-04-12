import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

const { width, height } = Dimensions.get('window')

interface OnboardingSlide {
  id: string
  title: string
  description: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  bgColor: string
  iconColor: string
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Viaja con Trive',
    description: 'Encuentra rutas cercanas a ti de forma rápida y segura. Conduce con conductores verificados.',
    icon: 'steering',
    bgColor: 'rgba(232, 240, 254, 0.45)',
    iconColor: COLORS.primary,
  },
  {
    id: '2',
    title: 'Reserva tu asiento',
    description: 'Selecciona el número de asientos que necesitas y viaja cómodo con otros pasajeros.',
    icon: 'seat-recline-normal',
    bgColor: 'rgba(227, 242, 253, 0.45)',
    iconColor: COLORS.accent,
  },
  {
    id: '3',
    title: 'Pago seguro',
    description: 'Paga de forma segura desde la app. Sin efectivo, sin complicaciones.',
    icon: 'shield-check',
    bgColor: 'rgba(232, 245, 233, 0.45)',
    iconColor: '#10B981',
  },
  {
    id: '4',
    title: 'Califica tu viaje',
    description: 'Ayúdanos a mejorar calificando a los conductores y manteniendo la calidad del servicio.',
    icon: 'star-circle',
    bgColor: 'rgba(255, 243, 224, 0.45)',
    iconColor: '#F59E0B',
  },
]

interface OnboardingScreenProps {
  onComplete: () => void
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollX = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<ScrollView>(null)

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width)
        setCurrentIndex(index)
      },
    }
  )

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      })
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const goToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    })
  }

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    })

    const rotate = scrollX.interpolate({
      inputRange,
      outputRange: ['-8deg', '0deg', '8deg'],
      extrapolate: 'clamp',
    })

    const textOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.2, 1, 0.2],
      extrapolate: 'clamp',
    })

    const textTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, -30],
      extrapolate: 'clamp',
    })

    return (
      <View key={slide.id} style={styles.slide}>
        <View style={styles.cardWrapper}>
          <View style={styles.cardHeader}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: slide.bgColor,
                  transform: [{ scale }, { rotate }],
                },
              ]}
            >
              <MaterialCommunityIcons name={slide.icon} size={58} color={slide.iconColor} />
            </Animated.View>
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText}>Paso {index + 1}</Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
          </Animated.View>
        </View>
      </View>
    )
  }

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {slides.map((slide, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [12, 32, 12],
            extrapolate: 'clamp',
          })

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          })

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              onPress={() => goToSlide(index)}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor:
                      index === currentIndex ? COLORS.primary : COLORS.borderLight,
                  },
                ]}
              />
            </TouchableOpacity>
          )
        })}
      </View>
    )
  }

  const isLastSlide = currentIndex === slides.length - 1

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Fondo limpio sin gradiente azul */}
      <View style={styles.bgContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB', '#F3F4F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bienvenido a Trive</Text>
          <Text style={styles.headerSubtitle}>Viajes compartidos profesionales y seguros.</Text>
        </View>

        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>
            {isLastSlide ? '' : 'Omitir'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground} />
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: scrollX.interpolate({
                inputRange: [0, (slides.length - 1) * width],
                outputRange: ['25%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={width}
        style={styles.scrollView}
      >
        {slides.map(renderSlide)}
      </ScrollView>

      {/* Footer con paginación y botón */}
      <View style={styles.footer}>
        {/* Números de página */}
        <View style={styles.pageIndicator}>
          {slides.map((_, index) => (
            <Text
              key={index}
              style={[
                styles.pageNumber,
                index === currentIndex && styles.pageNumberActive,
              ]}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
          ))}
        </View>

        {renderPagination()}

        {/* Botón siguiente / comenzar */}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            isLastSlide && styles.getStartedBtn,
          ]}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.nextBtnText,
              isLastSlide && styles.getStartedBtnText,
            ]}
          >
            {isLastSlide ? 'Comenzar' : 'Siguiente'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={isLastSlide ? '#fff' : COLORS.primary}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Fondo con gradiente profundo
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...TYPOGRAPHY.h4,
    color: '#1a1a1a',
    fontWeight: '800',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#666666',
    marginTop: SPACING.xs,
  },
  skipBtn: {
    padding: SPACING.sm,
  },
  skipText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  cardWrapper: {
    width: width * 0.82,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.deep,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  cardLabel: {
    backgroundColor: 'rgba(15,15,15,0.05)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  cardLabelText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.orangeSoft,
  },
  textContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  slideTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: SPACING.sm,
  },
  slideDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'left',
    lineHeight: 26,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    marginBottom: SPACING.lg,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  progressBarBackground: {
    position: 'absolute',
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  progressBarFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl + 12,
    paddingTop: SPACING.lg,
    alignItems: 'center',
    width: '100%',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  pageNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
    marginHorizontal: SPACING.xs,
  },
  pageNumberActive: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: SPACING.xs,
    backgroundColor: '#D1D5DB',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    gap: SPACING.sm,
    width: '100%',
    ...SHADOWS.deep,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  getStartedBtn: {
    backgroundColor: COLORS.primary,
  },
  getStartedBtnText: {
    color: '#fff',
  },
})
