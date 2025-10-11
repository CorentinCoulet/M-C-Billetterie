'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Minus, Plus, HelpCircle as Question } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    id: 1,
    question: "Comment puis-je réserver des billets ?",
    answer: "Pour réserver des billets, parcourez notre sélection d'événements, choisissez l'événement qui vous intéresse, sélectionnez vos places et procédez au paiement sécurisé."
  },
  {
    id: 2,
    question: "Puis-je annuler ma réservation ?",
    answer: "Les annulations sont possibles jusqu'à 48h avant l'événement. Contactez notre service client pour toute demande d'annulation."
  },
  {
    id: 3,
    question: "Comment recevrai-je mes billets ?",
    answer: "Vos billets électroniques vous seront envoyés par email immédiatement après confirmation du paiement. Vous pourrez les présenter depuis votre smartphone."
  },
  {
    id: 4,
    question: "Quels moyens de paiement acceptez-vous ?",
    answer: "Nous acceptons les cartes bancaires (Visa, Mastercard, American Express), PayPal et les virements bancaires."
  },
  {
    id: 5,
    question: "Que faire si j'ai perdu mes billets ?",
    answer: "Ne vous inquiétez pas ! Contactez-nous avec votre numéro de réservation et nous pourrons vous renvoyer vos billets électroniques."
  },
  {
    id: 6,
    question: "Les prix incluent-ils les frais de service ?",
    answer: "Tous nos prix sont affichés TTC. Les éventuels frais de service sont clairement indiqués avant le paiement."
  },
  {
    id: 7,
    question: "Puis-je transférer mes billets à quelqu'un d'autre ?",
    answer: "Cela dépend de l'événement. Pour certains événements, le transfert est possible via votre espace personnel. Vérifiez les conditions spécifiques à chaque événement."
  },
  {
    id: 8,
    question: "Que se passe-t-il si un événement est annulé ?",
    answer: "En cas d'annulation d'un événement, vous serez remboursé intégralement automatiquement sous 5 à 10 jours ouvrés."
  }
]

export default function FAQPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const goBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  const goToContact = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/contact'
    }
  }

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id)
  }

  return (
    <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <button 
            onClick={goBack}
            className="mb-6 bg-card/50 backdrop-blur-sm hover:bg-card/70 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all px-4 py-2 border border-border"
          >
            <ArrowLeft size={16} className="mr-2" />
            Retour
          </button>
          
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-8">
              <Question size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-6">
              Foire aux Questions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trouvez rapidement les réponses à vos questions les plus fréquentes.
            </p>
          </div>
        </motion.div>

        {/* FAQ List */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-xl overflow-hidden group relative"
              whileHover={{ 
                scale: 1.02,
                y: -4,
                transition: { duration: 0.3 }
              }}
            >
              {/* Effet de brillance au hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full p-6 text-left flex items-center justify-between relative z-10 transition-all duration-300 group-hover:bg-card/30"
              >
                <h3 className="text-lg font-semibold text-foreground pr-4 transition-colors duration-300 group-hover:text-primary">
                  {faq.question}
                </h3>
                <motion.div 
                  className="flex-shrink-0"
                  animate={{ rotate: openFAQ === faq.id ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {openFAQ === faq.id ? (
                    <Minus size={20} className="text-primary" />
                  ) : (
                    <Plus size={20} className="text-primary transition-transform duration-300 group-hover:scale-110" />
                  )}
                </motion.div>
              </button>
              
              <AnimatePresence initial={false}>
                {openFAQ === faq.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: 1, 
                      height: 'auto',
                      transition: {
                        height: { duration: 0.4, ease: "easeInOut" },
                        opacity: { duration: 0.3, delay: 0.1 }
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      height: 0,
                      transition: {
                        height: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.2 }
                      }
                    }}
                    className="px-6 pb-6 overflow-hidden"
                  >
                    <div className="border-t border-border pt-4">
                      <motion.p 
                        initial={{ y: -10 }}
                        animate={{ y: 0 }}
                        exit={{ y: -10 }}
                        className="text-muted-foreground leading-relaxed"
                      >
                        {faq.answer}
                      </motion.p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12"
        >
          <div className="glass-card rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="text-muted-foreground mb-6">
              Notre équipe de support est là pour vous aider. N'hésitez pas à nous contacter.
            </p>
            <button 
              onClick={goToContact}
              className="glass-button text-white font-semibold px-8 py-3 bg-gradient-to-r from-blue-700 to-blue-600 rounded-md transition-all hover:from-blue-800 hover:to-blue-700"
            >
              Nous contacter
            </button>
          </div>
        </motion.div>
      </div>
  )
}