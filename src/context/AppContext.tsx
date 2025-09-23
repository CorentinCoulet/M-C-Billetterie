'use client'

import { createContext, ReactNode, useContext } from 'react'

interface AppContextType {
  // Define global context properties here if needed
}

const AppContext = createContext<AppContextType>({})

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const value: AppContextType = {
    // Context values
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}