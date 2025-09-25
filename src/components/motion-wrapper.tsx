'use client'

import { motion, MotionProps } from 'framer-motion'
import { useEffect, useState } from 'react'

interface MotionWrapperProps extends MotionProps {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
}

export function MotionWrapper({ 
  children, 
  as: Component = 'div',
  className,
  ...motionProps 
}: MotionWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Pendant l'hydratation, on rend un composant statique
  if (!mounted) {
    const StaticComponent = Component as any
    return <StaticComponent className={className}>{children}</StaticComponent>
  }

  // Une fois hydraté, on peut utiliser Framer Motion
  const MotionComponent = motion[Component as keyof typeof motion] as any
  
  return (
    <MotionComponent className={className} {...motionProps}>
      {children}
    </MotionComponent>
  )
}