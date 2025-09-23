'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ArrowLeft, Plus, Minus, HelpCircle as Question } from 'lucide-react'

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
    <div className="min-h-screen pt-24 pb-12">
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
              className="glass-card rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-card/20 transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </h3>
                <div className="flex-shrink-0">
                  {openFAQ === faq.id ? (
                    <Minus size={20} className="text-primary" />
                  ) : (
                    <Plus size={20} className="text-primary" />
                  )}
                </div>
              </button>
              
              {openFAQ === faq.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-6"
                >
                  <div className="border-t border-border pt-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              )}
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
              className="glass-button text-white font-semibold px-8 py-3 bg-gradient-to-r from-primary to-accent rounded-md transition-all hover:opacity-90"
            >
              Nous contacter
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}