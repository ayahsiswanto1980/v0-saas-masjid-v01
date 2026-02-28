import { create } from 'zustand'

interface OfflineStore {
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  pendingSyncCount: number
  lastSyncTime?: Date

  setOnline: (online: boolean) => void
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void
  setPendingSyncCount: (count: number) => void
  setLastSyncTime: (time: Date) => void
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncStatus: 'idle',
  pendingSyncCount: 0,
  lastSyncTime: undefined,

  setOnline: (online) => set({ isOnline: online }),

  setSyncStatus: (status) => set({ syncStatus: status }),

  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  setLastSyncTime: (time) => set({ lastSyncTime: time }),
}))

// Initialize online status listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.setState({ isOnline: true })
  })
  window.addEventListener('offline', () => {
    useOfflineStore.setState({ isOnline: false })
  })
}
