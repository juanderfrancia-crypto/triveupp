import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

export interface AppUser {
  id: string
  name: string
  email: string
  phone?: string
  role: 'passenger' | 'driver' | 'support'
  rating: number
  avatar_url?: string
  is_admin?: boolean
  spent?: number
  earnings?: number
}

interface AppState {
  user: AppUser | null
  authUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  balance: number
  selectedSeat: number | null
  selectedRoute: any | null
  bookingData: any | null
  hasSeenOnboarding: boolean
  notificationUnreadCount: number

  setUser: (user: AppUser | null) => void
  setAuthUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setBalance: (balance: number) => void
  setSelectedSeat: (seat: number | null) => void
  setSelectedRoute: (route: any | null) => void
  setBookingData: (data: any | null) => void
  setHasSeenOnboarding: (seen: boolean) => void
  setNotificationUnreadCount: (notificationUnreadCount: number) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authUser: null,
  isAuthenticated: false,
  isLoading: false,
  balance: 45800,
  selectedSeat: null,
  selectedRoute: null,
  bookingData: null,
  hasSeenOnboarding: false,
  notificationUnreadCount: 0,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthUser: (authUser) => set({ authUser }),
  setLoading: (isLoading) => set({ isLoading }),
  setBalance: (balance) => set({ balance }),
  setSelectedSeat: (selectedSeat) => set({ selectedSeat }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  setBookingData: (bookingData) => set({ bookingData }),
  setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
  setNotificationUnreadCount: (notificationUnreadCount) => set({ notificationUnreadCount }),
  logout: () => set({
    user: null,
    authUser: null,
    isAuthenticated: false,
    balance: 0,
    selectedSeat: null,
    selectedRoute: null,
    bookingData: null,
  }),
}))

// Mock user para pruebas sin Supabase
export const MOCK_USER: AppUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'María Pasajera',
  email: 'maria@test.com',
  phone: '+57 320 123 4567',
  role: 'passenger',
  rating: 4.8,
  avatar_url: 'https://via.placeholder.com/150?text=Maria',
}
