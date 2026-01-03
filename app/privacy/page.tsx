'use client'

import { ArrowLeft, Cookie, Download, Envelope, Lock, Shield, ShoppingBag, User, Warning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '../../src/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Separator } from '../../src/components/ui/separator'

export default function PrivacyPage() {
  const sections = [
    {
      id: 'collecte',
      icon: <User size={24} weight="duotone" />,
      title: 'Données collectées',
      color: 'from-blue-500 to-indigo-600',
      content: (
        <div className="space-y-4">
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Données d&apos;identification :</strong> nom, prénom, adresse e-mail</li>
            <li><strong>Données de connexion :</strong> adresse IP, date et heure de connexion</li>
            <li><strong>Données de transaction :</strong> historique des commandes, billets achetés</li>
            <li><strong>Préférences :</strong> consentements marketing, préférences de cookies</li>
            <li><strong>Avis et commentaires :</strong> notes et commentaires sur les événements</li>
          </ul>
        </div>
      )
    },
    {
      id: 'utilisation',
      icon: <ShoppingBag size={24} weight="duotone" />,
      title: 'Utilisation des données',
      color: 'from-green-500 to-emerald-600',
      content: (
        <div className="space-y-4">
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Gérer votre compte et vos commandes</li>
            <li>Vous envoyer vos billets et confirmations de commande</li>
            <li>Améliorer nos services grâce à l&apos;analyse d&apos;usage</li>
            <li>Vous envoyer des communications marketing (avec votre consentement)</li>
            <li>Assurer la sécurité de notre plateforme</li>
            <li>Respecter nos obligations légales</li>
          </ul>
        </div>
      )
    },
    {
      id: 'cookies',
      icon: <Cookie size={24} weight="duotone" />,
      title: 'Cookies et traceurs',
      color: 'from-orange-500 to-amber-600',
      content: (
        <div className="space-y-4">
          <p>Nous utilisons différents types de cookies :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Cookies essentiels :</strong> nécessaires au fonctionnement du site (authentification, panier)</li>
            <li><strong>Cookies analytiques :</strong> mesurer l&apos;audience et améliorer notre service (désactivables)</li>
            <li><strong>Cookies marketing :</strong> personnaliser les publicités (désactivables)</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Vous pouvez gérer vos préférences de cookies dans votre profil, section &quot;Mes données&quot;.
          </p>
        </div>
      )
    },
    {
      id: 'securite',
      icon: <Lock size={24} weight="duotone" />,
      title: 'Sécurité des données',
      color: 'from-purple-500 to-violet-600',
      content: (
        <div className="space-y-4">
          <p>Nous mettons en œuvre des mesures de sécurité robustes :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Chiffrement des données en transit (HTTPS/TLS)</li>
            <li>Hachage sécurisé des mots de passe (bcrypt)</li>
            <li>Authentification à deux facteurs disponible</li>
            <li>Audits de sécurité réguliers</li>
            <li>Accès restreint aux données personnelles</li>
            <li>Sauvegarde régulière des données</li>
          </ul>
        </div>
      )
    },
    {
      id: 'droits',
      icon: <Shield size={24} weight="duotone" />,
      title: 'Vos droits RGPD',
      color: 'from-teal-500 to-cyan-600',
      content: (
        <div className="space-y-4">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Droit d&apos;accès (Art. 15) :</strong> obtenir une copie de vos données</li>
            <li><strong>Droit de rectification (Art. 16) :</strong> corriger vos données inexactes</li>
            <li><strong>Droit à l&apos;effacement (Art. 17) :</strong> supprimer votre compte et vos données</li>
            <li><strong>Droit à la portabilité (Art. 20) :</strong> récupérer vos données dans un format lisible</li>
            <li><strong>Droit d&apos;opposition (Art. 21) :</strong> vous opposer au traitement de vos données</li>
            <li><strong>Droit de limitation (Art. 18) :</strong> limiter le traitement de vos données</li>
          </ul>
          <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
            <p className="text-sm">
              Vous pouvez exercer ces droits directement depuis votre profil ou en nous contactant à l&apos;adresse : 
              <a href="mailto:privacy@billetterie.fr" className="text-teal-600 font-semibold ml-1">privacy@billetterie.fr</a>
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'conservation',
      icon: <Download size={24} weight="duotone" />,
      title: 'Durée de conservation',
      color: 'from-pink-500 to-rose-600',
      content: (
        <div className="space-y-4">
          <p>Nous conservons vos données selon les durées suivantes :</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Données de compte :</strong> jusqu&apos;à suppression du compte + 3 ans</li>
            <li><strong>Données de transaction :</strong> 10 ans (obligations comptables)</li>
            <li><strong>Logs de connexion :</strong> 1 an</li>
            <li><strong>Cookies analytiques :</strong> 13 mois maximum</li>
          </ul>
        </div>
      )
    },
    {
      id: 'contact',
      icon: <Envelope size={24} weight="duotone" />,
      title: 'Nous contacter',
      color: 'from-indigo-500 to-blue-600',
      content: (
        <div className="space-y-4">
          <p>Pour toute question concernant vos données personnelles :</p>
          <div className="space-y-2 ml-4">
            <p><strong>Responsable du traitement :</strong> Billetterie SAS</p>
            <p><strong>Délégué à la protection des données :</strong> <a href="mailto:dpo@billetterie.fr" className="text-indigo-600">dpo@billetterie.fr</a></p>
            <p><strong>Adresse :</strong> 123 Avenue des Événements, 75001 Paris</p>
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start space-x-2">
              <Warning size={20} className="text-amber-600 flex-shrink-0 mt-0.5" weight="duotone" />
              <p className="text-sm text-amber-800">
                Vous avez le droit d&apos;introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique et des Libertés) si vous estimez que le traitement de vos données n&apos;est pas conforme au RGPD.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/">
            <Button variant="ghost" className="mb-4 hover:bg-white/50">
              <ArrowLeft size={20} className="mr-2" />
              Retour à l&apos;accueil
            </Button>
          </Link>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <Shield size={32} weight="duotone" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Politique de Confidentialité
              </h1>
              <p className="text-muted-foreground">
                Dernière mise à jour : 3 janvier 2026
              </p>
            </div>
          </div>
          
          <Card className="glass-card border-2 border-white/50 shadow-lg">
            <CardContent className="pt-6">
              <p className="text-gray-700">
                Nous attachons une grande importance à la protection de vos données personnelles. 
                Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons 
                vos informations conformément au Règlement Général sur la Protection des Données (RGPD).
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table of contents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="glass-card border-2 border-white/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Sommaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                    <span className="text-sm font-medium text-gray-700 hover:text-primary">
                      {section.title}
                    </span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 2) }}
            >
              <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
                <CardHeader className={`bg-gradient-to-r ${section.color.replace('from-', 'from-').replace('to-', 'to-')}/5 border-b border-white/20`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white shadow-lg`}>
                      {section.icon}
                    </div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {section.content}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <Card className="glass-card border-2 border-white/50 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-600/5 border-b border-white/20">
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Link href="/profile?tab=data">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all">
                    <Download size={18} className="mr-2" />
                    Télécharger mes données
                  </Button>
                </Link>
                <Link href="/profile?tab=data">
                  <Button variant="outline" className="border-2 shadow-lg hover:shadow-xl transition-all">
                    <Shield size={18} className="mr-2" />
                    Gérer mes consentements
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="border-2 shadow-lg hover:shadow-xl transition-all">
                    <Envelope size={18} className="mr-2" />
                    Contacter le DPO
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator className="my-8" />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          © 2026 Billetterie. Tous droits réservés.
        </motion.p>
      </div>
    </div>
  )
}
