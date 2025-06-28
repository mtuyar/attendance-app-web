import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  login: (password: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      login: (password: string) => {
        if (password === 'admin1234') {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },
      logout: () => {
        set({ isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
) 