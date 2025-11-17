'use client'

import { Button } from '@/components/ui/button'
import { Clock, Star, Ticket, Users } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export default function HomePage() {
  const router = useRouter()

  const navigate = useCallback((page: string) => {
    const target = page?.startsWith('/') ? page : `/${page}`
    try {
      if (router && typeof router.push === 'function') {
        router.push(target as any)
      } else if (typeof window !== 'undefined') {
        window.location.assign(target)
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(target)
      }
    }
  }, [router])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
          aria-labelledby="hero-title"
        >
          <div className="glass-card rounded-3xl p-8 sm:p-12 mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8" aria-hidden="true">
              <Ticket size={40} className="text-white sm:w-12 sm:h-12" />
            </div>
            <h1 id="hero-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Bienvenue sur M&C Billetterie
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              Découvrez et réservez vos places pour les meilleurs événements. 
              Concerts, spectacles, festivals et bien plus encore vous attendent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('events')}
                className="glass-button text-white font-semibold px-8 py-3"
                aria-label="Découvrir tous les événements disponibles"
              >
                Découvrir les événements
              </Button>
              <Button 
                onClick={() => navigate('about')}
                variant="outline" 
                className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/70"
                aria-label="En savoir plus sur M&C Billetterie"
              >
                En savoir plus
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Features Grid */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          aria-labelledby="features-title"
        >
          <h2 id="features-title" className="sr-only">Nos fonctionnalités principales</h2>
          
          <article className="glass-card rounded-2xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
              <Star size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Événements Premium</h3>
            <p className="text-muted-foreground leading-relaxed">
              Une sélection soignée des meilleurs événements culturels et artistiques.
            </p>
          </article>

          <article className="glass-card rounded-2xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
              <Clock size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Réservation Rapide</h3>
            <p className="text-muted-foreground leading-relaxed">
              Réservez vos places en quelques clics avec notre système sécurisé.
            </p>
          </article>

          <article className="glass-card rounded-2xl p-6 sm:p-8 text-center sm:col-span-2 lg:col-span-1">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
              <Users size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Communauté</h3>
            <p className="text-muted-foreground leading-relaxed">
              Rejoignez des milliers d&#39;amateurs d&#39;art et de culture comme vous.
            </p>
          </article>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="glass-card rounded-3xl p-8 sm:p-12 text-center"
          aria-labelledby="cta-title"
        >
          <h2 id="cta-title" className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Prêt à vivre des expériences uniques ?
          </h2>
          <p className="text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
            Explorez notre sélection d&#39;événements et trouvez votre prochaine sortie.
          </p>
          <Button 
            onClick={() => navigate('events')}
            className="glass-button text-white font-semibold px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg"
            aria-label="Voir tous les événements disponibles"
          >
            Voir tous les événements
          </Button>
        </motion.section>
      </div>
  )
}
