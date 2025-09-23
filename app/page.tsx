'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Ticket, Star, Clock, Users } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  const navigate = (page: string) => {
    router.push(`/${page}`)
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="glass-card rounded-3xl p-12 mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-8">
              <Ticket size={48} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Bienvenue sur M&C Billetterie
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Découvrez et réservez vos places pour les meilleurs événements. 
              Concerts, spectacles, festivals et bien plus encore vous attendent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('events')}
                className="glass-button text-white font-semibold px-8 py-3"
              >
                Découvrir les événements
              </Button>
              <Button 
                onClick={() => navigate('about')}
                variant="outline" 
                className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/70"
              >
                En savoir plus
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Star size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Événements Premium</h3>
            <p className="text-muted-foreground">
              Une sélection soignée des meilleurs événements culturels et artistiques.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Réservation Rapide</h3>
            <p className="text-muted-foreground">
              Réservez vos places en quelques clics avec notre système sécurisé.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Communauté</h3>
            <p className="text-muted-foreground">
              Rejoignez des milliers d'amateurs d'art et de culture comme vous.
            </p>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="glass-card rounded-3xl p-12 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Prêt à vivre des expériences uniques ?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Explorez notre sélection d'événements et trouvez votre prochaine sortie.
          </p>
          <Button 
            onClick={() => navigate('events')}
            className="glass-button text-white font-semibold px-12 py-4 text-lg"
          >
            Voir tous les événements
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
