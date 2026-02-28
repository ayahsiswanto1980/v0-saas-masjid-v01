import React, { createContext, useContext, useState, useCallback } from 'react'
import { Tenant, User } from '@/types'

interface TenantContextType {
  currentTenant: Tenant | null
  currentUser: User | null
  setTenant: (tenant: Tenant) => void
  setUser: (user: User) => void
  logout: () => void
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const handleSetTenant = useCallback((tenant: Tenant) => {
    setCurrentTenant(tenant)
    // Persist to localStorage for offline support
    localStorage.setItem('currentTenant', JSON.stringify(tenant))
  }, [])

  const handleSetUser = useCallback((user: User) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }, [])

  const handleLogout = useCallback(() => {
    setCurrentTenant(null)
    setCurrentUser(null)
    localStorage.removeItem('currentTenant')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('authToken')
  }, [])

  // Load from localStorage on mount
  React.useEffect(() => {
    const tenant = localStorage.getItem('currentTenant')
    const user = localStorage.getItem('currentUser')
    if (tenant) setCurrentTenant(JSON.parse(tenant))
    if (user) setCurrentUser(JSON.parse(user))
  }, [])

  const value: TenantContextType = {
    currentTenant,
    currentUser,
    setTenant: handleSetTenant,
    setUser: handleSetUser,
    logout: handleLogout,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
