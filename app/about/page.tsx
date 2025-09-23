'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Ticket, Heart, Shield } from '@phosphor-icons/react'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <Button 
            onClick={() => router.back()}
            variant="outline" 
            className="mb-6 bg-card/50 backdrop-blur-sm hover:bg-card/70"
          >
            <ArrowLeft size={16} className="mr-2" />
            Retour
          </Button>
          
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-8">
              <Heart size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-6">
              À propos de M&C Billetterie
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Votre partenaire de confiance pour découvrir et réserver les meilleurs événements culturels.
            </p>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Notre Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              M&C Billetterie a été créé avec une vision simple : rendre la culture accessible à tous. 
              Nous croyons que chacun mérite de vivre des expériences artistiques exceptionnelles, 
              qu'il s'agisse d'un concert intime, d'un spectacle grandiose ou d'un festival vibrant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6">
                <Ticket size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Simplicité</h3>
              <p className="text-muted-foreground">
                Une interface intuitive pour réserver vos places en quelques clics.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6">
                <Shield size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Sécurité</h3>
              <p className="text-muted-foreground">
                Paiements sécurisés et protection de vos données personnelles.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Notre Équipe</h2>
            <p className="text-muted-foreground leading-relaxed">
              Composée de passionnés de culture et de technologie, notre équipe travaille 
              chaque jour pour vous offrir la meilleure expérience possible. Nous collaborons 
              étroitement avec les organisateurs d'événements pour vous proposer une sélection 
              de qualité et vous garantir des moments inoubliables.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Rejoignez l'aventure
            </h2>
            <p className="text-muted-foreground mb-6">
              Découvrez notre sélection d'événements et vivez des expériences uniques.
            </p>
            <Button 
              onClick={() => router.push('/events')}
              className="glass-button text-white font-semibold px-8 py-3"
            >
              Voir les événements
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}