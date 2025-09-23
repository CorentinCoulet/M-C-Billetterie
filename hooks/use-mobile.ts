import { useEffect, useState } from 'react'

/**
 * Hook to detect if the device is mobile
 * @param breakpoint - breakpoint in pixels (default 768)
 * @returns true if the screen is smaller than the breakpoint
 */
export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    
    // Initialize the value
    setIsMobile(mediaQuery.matches)
    
    // Callback function for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    // Add the listener
    mediaQuery.addEventListener('change', handleChange)
    
    // Clean up the listener
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [breakpoint])

  return isMobile
}