'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Book, CreditCard, Envelope, FileText, Question, Shield, Ticket, Users } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const helpCategories = [
  {
    id: 1,
    title: "Réservation et achat",
    description: "Tout savoir sur la réservation de billets et le processus d'achat",
    icon: Ticket,
    color: "from-blue-500 to-blue-600",
    articles: [
      {
        title: "Comment réserver des billets",
        content: "Pour réserver des billets, parcourez notre catalogue d'événements, sélectionnez l'événement qui vous intéresse, choisissez vos places et le nombre de billets souhaités. Suivez ensuite les étapes de paiement sécurisé. Une confirmation vous sera envoyée par email."
      },
      {
        title: "Modifier une réservation",
        content: "Les modifications de réservation sont possibles jusqu'à 48h avant l'événement. Connectez-vous à votre compte, accédez à 'Mes réservations', sélectionnez la réservation à modifier et suivez les instructions. Des frais peuvent s'appliquer selon les conditions de l'événement."
      },
      {
        title: "Choisir ses places",
        content: "Sur la page de l'événement, cliquez sur 'Choisir mes places' pour accéder au plan de salle interactif. Les places disponibles sont affichées en vert. Sélectionnez vos places préférées et validez votre choix. Les catégories de prix sont clairement indiquées."
      },
      {
        title: "Codes promotionnels",
        content: "Vous pouvez saisir un code promotionnel lors du processus de paiement, juste avant la validation finale. Le code sera appliqué automatiquement et la réduction apparaîtra dans le récapitulatif. Les codes ne sont pas cumulables et ont une date de validité."
      }
    ]
  },
  {
    id: 2,
    title: "Paiement",
    description: "Questions relatives aux moyens de paiement et à la sécurité",
    icon: CreditCard,
    color: "from-green-500 to-green-600",
    articles: [
      {
        title: "Moyens de paiement acceptés",
        content: "Nous acceptons les cartes bancaires Visa, Mastercard et American Express. Vous pouvez également payer via PayPal, Apple Pay ou Google Pay. Pour les commandes importantes, le virement bancaire est disponible sur demande."
      },
      {
        title: "Sécurité des transactions",
        content: "Toutes nos transactions sont sécurisées par protocole SSL et cryptées de bout en bout. Nous utilisons le système 3D Secure pour une protection supplémentaire. Vos données bancaires ne sont jamais stockées sur nos serveurs et sont traitées par notre partenaire de paiement certifié PCI-DSS."
      },
      {
        title: "Échec de paiement",
        content: "En cas d'échec de paiement, vérifiez d'abord les coordonnées de votre carte et votre plafond de paiement. Assurez-vous que le 3D Secure est activé. Si le problème persiste, contactez votre banque ou essayez un autre moyen de paiement. Les places restent réservées pendant 15 minutes."
      },
      {
        title: "Remboursements",
        content: "Les remboursements sont effectués selon le moyen de paiement initial sous 5 à 10 jours ouvrés. En cas d'annulation d'événement, le remboursement est automatique et intégral. Pour une demande de remboursement volontaire, consultez les conditions spécifiques de l'événement."
      }
    ]
  },
  {
    id: 3,
    title: "Billets électroniques",
    description: "Gestion et utilisation de vos billets",
    icon: FileText,
    color: "from-purple-500 to-purple-600",
    articles: [
      {
        title: "Recevoir mes billets",
        content: "Vos billets électroniques sont envoyés immédiatement après confirmation du paiement à l'adresse email fournie lors de la commande. Ils sont également disponibles dans votre espace personnel, section 'Mes billets'. Pensez à vérifier vos spams si vous ne les recevez pas."
      },
      {
        title: "Présenter mes billets",
        content: "Présentez vos billets directement depuis votre smartphone en affichant le QR code. Vous pouvez aussi les imprimer si vous préférez. Le QR code sera scanné à l'entrée de l'événement. Assurez-vous que le code soit bien visible et non endommagé."
      },
      {
        title: "Billets perdus",
        content: "Pas de panique ! Connectez-vous à votre compte et téléchargez à nouveau vos billets depuis 'Mes réservations'. Vous pouvez également nous contacter avec votre numéro de commande et nous vous les renverrons par email dans les plus brefs délais."
      },
      {
        title: "Transférer des billets",
        content: "Le transfert de billets est possible pour certains événements. Accédez à votre réservation, cliquez sur 'Transférer' et saisissez l'email du destinataire. Il recevra ses billets directement. Le transfert peut être soumis à conditions selon l'organisateur."
      }
    ]
  },
  {
    id: 4,
    title: "Compte utilisateur",
    description: "Gérer votre compte et vos informations",
    icon: Users,
    color: "from-orange-500 to-orange-600",
    articles: [
      {
        title: "Créer un compte",
        content: "Cliquez sur 'Connexion' puis 'Créer un compte'. Remplissez le formulaire avec vos informations personnelles et choisissez un mot de passe sécurisé. Validez votre email via le lien de confirmation. Un compte vous permet de suivre vos réservations et de profiter d'offres exclusives."
      },
      {
        title: "Modifier mes informations",
        content: "Connectez-vous à votre compte et accédez à 'Mon profil'. Vous pouvez modifier votre nom, email, numéro de téléphone et adresse. N'oubliez pas de sauvegarder vos modifications. Pour changer votre mot de passe, utilisez l'option dédiée dans les paramètres de sécurité."
      },
      {
        title: "Mot de passe oublié",
        content: "Cliquez sur 'Mot de passe oublié' sur la page de connexion. Saisissez votre email et vous recevrez un lien de réinitialisation valable 24h. Suivez les instructions pour créer un nouveau mot de passe sécurisé. Si vous ne recevez pas l'email, vérifiez vos spams."
      },
      {
        title: "Supprimer mon compte",
        content: "Vous pouvez demander la suppression de votre compte depuis les paramètres, section 'Confidentialité'. Cette action est irréversible et entraîne la suppression de toutes vos données personnelles conformément au RGPD. Les historiques de commandes nécessaires aux obligations légales seront conservés anonymement."
      }
    ]
  },
  {
    id: 5,
    title: "Sécurité et confidentialité",
    description: "Protection de vos données et politique de confidentialité",
    icon: Shield,
    color: "from-red-500 to-red-600",
    articles: [
      {
        title: "Protection des données",
        content: "Nous prenons la protection de vos données très au sérieux. Toutes les informations personnelles sont stockées de manière sécurisée et cryptées. Nous utilisons des pare-feu et des systèmes de détection d'intrusion. Seules les personnes autorisées ont accès à vos données."
      },
      {
        title: "RGPD",
        content: "Conformément au RGPD, vous avez le droit d'accéder, de rectifier, de supprimer vos données personnelles. Vous pouvez également demander la portabilité de vos données ou vous opposer à leur traitement. Pour exercer ces droits, contactez notre DPO via la page de contact."
      },
      {
        title: "Cookies",
        content: "Notre site utilise des cookies pour améliorer votre expérience de navigation et analyser notre trafic. Vous pouvez gérer vos préférences de cookies via le bandeau qui apparaît lors de votre première visite. Les cookies essentiels au fonctionnement du site ne peuvent être désactivés."
      },
      {
        title: "Signaler un problème",
        content: "Si vous détectez une activité suspecte sur votre compte ou un problème de sécurité, contactez-nous immédiatement via notre page de contact ou à security@mc-billetterie.com. Changez votre mot de passe dès que possible et vérifiez l'activité récente de votre compte."
      }
    ]
  },
  {
    id: 6,
    title: "Questions fréquentes",
    description: "Réponses aux questions les plus courantes",
    icon: Question,
    color: "from-pink-500 to-pink-600",
    articles: [
      {
        title: "Annulation d'événement",
        content: "En cas d'annulation d'un événement par l'organisateur, vous serez automatiquement remboursé intégralement sous 5 à 10 jours ouvrés. Un email de notification vous sera envoyé. Si l'événement est reporté, vos billets restent valables pour la nouvelle date. Vous pouvez demander un remboursement si vous ne pouvez pas assister à la nouvelle date."
      },
      {
        title: "Accessibilité PMR",
        content: "Nous nous engageons à rendre nos événements accessibles à tous. Les emplacements PMR sont indiqués sur le plan de salle. Lors de votre réservation, sélectionnez l'option 'Accessibilité' pour bénéficier d'un emplacement adapté. N'hésitez pas à nous contacter pour toute question spécifique concernant l'accessibilité."
      },
      {
        title: "Âge minimum",
        content: "L'âge minimum requis varie selon les événements et est clairement indiqué sur la page de l'événement. Pour certains spectacles, les enfants de moins de 3 ans ne sont pas admis. Une pièce d'identité peut être demandée à l'entrée pour les événements avec restriction d'âge."
      },
      {
        title: "Politique de retour",
        content: "Les billets sont généralement non remboursables sauf en cas d'annulation de l'événement. Certains événements proposent une assurance annulation lors de l'achat. Consultez les conditions spécifiques de chaque événement avant de finaliser votre achat."
      }
    ]
  }
]

const quickLinks = [
  {
    title: "FAQ complète",
    description: "Consultez notre foire aux questions",
    link: "/faq",
    icon: Question
  },
  {
    title: "Nous contacter",
    description: "Besoin d'aide personnalisée ?",
    link: "/contact",
    icon: Envelope
  }
]

export default function HelpPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCategoryClick = (categoryId: number) => {
    setSelectedCategory(categoryId)
    setIsModalOpen(true)
  }

  const currentCategory = helpCategories.find(cat => cat.id === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto px-6">
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
              <Book size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-6">
              Centre d'aide
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trouvez rapidement les informations dont vous avez besoin pour profiter pleinement de M&C Billetterie.
            </p>
          </div>
        </motion.div>

        {/* Help Categories Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-foreground mb-8">Parcourir par catégorie</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.03,
                  y: -8,
                  transition: { duration: 0.3 }
                }}
                className="glass-card rounded-2xl p-6 cursor-pointer group relative overflow-hidden"
                onClick={() => handleCategoryClick(category.id)}
              >
                {/* Effet de brillance au hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <category.icon size={28} className="text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3 transition-colors duration-300 group-hover:text-primary">
                    {category.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm mb-4">
                    {category.description}
                  </p>
                  
                  <div className="space-y-2">
                    {category.articles.map((article, idx) => (
                      <div key={idx} className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 opacity-60 group-hover:opacity-100" />
                        {article.title}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-foreground mb-8">Liens rapides</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {quickLinks.map((link, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                whileHover={{ 
                  scale: 1.02,
                  y: -4,
                  transition: { duration: 0.3 }
                }}
                className="glass-card rounded-2xl p-8 cursor-pointer group relative overflow-hidden"
                onClick={() => router.push(link.link)}
              >
                {/* Effet de brillance au hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <link.icon size={28} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                      {link.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                  <ArrowLeft size={24} className="text-primary rotate-180 transition-transform duration-300 group-hover:translate-x-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="glass-card rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Besoin d'aide supplémentaire ?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Notre équipe de support est disponible pour répondre à toutes vos questions. 
              N'hésitez pas à nous contacter directement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => router.push('/contact')}
                className="glass-button text-white font-semibold px-8 py-3"
              >
                <Envelope size={20} className="mr-2" />
                Contacter le support
              </Button>
              <Button 
                onClick={() => router.push('/faq')}
                variant="outline"
                className="bg-card/50 backdrop-blur-sm hover:bg-card/70 px-8 py-3"
              >
                <Question size={20} className="mr-2" />
                Voir la FAQ
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Modal for Category Details */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            {currentCategory && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${currentCategory.color} rounded-2xl flex items-center justify-center`}>
                      <currentCategory.icon size={32} className="text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">{currentCategory.title}</DialogTitle>
                      <DialogDescription className="text-base mt-1">
                        {currentCategory.description}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  {currentCategory.articles.map((article, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className="border-l-4 border-primary pl-4 py-2"
                    >
                      <h3 className="font-semibold text-lg text-foreground mb-2">
                        {article.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {article.content}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false)
                        router.push('/faq')
                      }}
                      className="bg-card/50 backdrop-blur-sm hover:bg-card/70"
                    >
                      <Question size={18} className="mr-2" />
                      Voir la FAQ
                    </Button>
                    <Button
                      onClick={() => {
                        setIsModalOpen(false)
                        router.push('/contact')
                      }}
                      className="glass-button text-white font-semibold"
                    >
                      <Envelope size={18} className="mr-2" />
                      Contacter le support
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}
