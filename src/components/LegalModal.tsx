'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

interface LegalModalProps {
  type: 'terms' | 'privacy'
  trigger: React.ReactNode
}

const TermsContent = () => (
  <div className="space-y-6">
    <section>
      <h3 className="text-lg font-semibold mb-3">1. Acceptation des conditions</h3>
      <p className="text-sm text-gray-600 mb-3">
        En utilisant notre plateforme de billetterie, vous acceptez pleinement et sans réserve 
        les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, 
        veuillez ne pas utiliser nos services.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">2. Description du service</h3>
      <p className="text-sm text-gray-600 mb-3">
        Notre plateforme permet aux organisateurs d'événements de vendre des billets en ligne 
        et aux utilisateurs d'acheter ces billets de manière sécurisée.
      </p>
      <p className="text-sm text-gray-600 mb-2">Les services incluent :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Création et gestion d'événements</li>
        <li>Vente de billets en ligne</li>
        <li>Paiement sécurisé</li>
        <li>Génération de codes QR pour les billets</li>
        <li>Système de notification</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">3. Inscription et compte utilisateur</h3>
      <p className="text-sm text-gray-600 mb-3">
        Pour utiliser certains services, vous devez créer un compte en fournissant des 
        informations exactes et complètes. Vous êtes responsable de la confidentialité 
        de vos identifiants de connexion.
      </p>
      <p className="text-sm text-gray-600 mb-2">Vous vous engagez à :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Fournir des informations véridiques</li>
        <li>Maintenir vos informations à jour</li>
        <li>Protéger vos identifiants de connexion</li>
        <li>Nous informer immédiatement de toute utilisation non autorisée</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">4. Utilisation acceptable</h3>
      <p className="text-sm text-gray-600 mb-2">Vous acceptez de ne pas utiliser notre service pour :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Des activités illégales ou non autorisées</li>
        <li>Harceler, menacer ou intimider d'autres utilisateurs</li>
        <li>Transmettre des virus ou autres codes malveillants</li>
        <li>Violer les droits de propriété intellectuelle</li>
        <li>Créer de faux comptes ou usurper l'identité d'autrui</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">5. Achat de billets</h3>
      <p className="text-sm text-gray-600 mb-3">
        Tous les achats sont finaux sauf indication contraire de l'organisateur de l'événement. 
        Les conditions de remboursement sont définies par chaque organisateur.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">6. Propriété intellectuelle</h3>
      <p className="text-sm text-gray-600 mb-3">
        Tous les contenus de la plateforme (textes, images, logos, codes) sont protégés 
        par les droits de propriété intellectuelle. Toute reproduction non autorisée est interdite.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">7. Limitation de responsabilité</h3>
      <p className="text-sm text-gray-600 mb-3">
        Notre responsabilité est limitée au montant payé pour les services. 
        Nous ne sommes pas responsables des dommages indirects ou consécutifs.
      </p>
    </section>

    <div className="mt-6 pt-4 border-t">
      <p className="text-xs text-gray-500">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>
    </div>
  </div>
)

const PrivacyContent = () => (
  <div className="space-y-6">
    <section>
      <h3 className="text-lg font-semibold mb-3">1. Introduction</h3>
      <p className="text-sm text-gray-600 mb-3">
        Nous accordons une grande importance à la protection de vos données personnelles. 
        Cette politique explique comment nous collectons, utilisons, stockons et protégeons vos informations, 
        en conformité avec le RGPD.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">2. Données collectées</h3>
      
      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données d'identification :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li>Nom et prénom</li>
          <li>Adresse email</li>
          <li>Numéro de téléphone</li>
          <li>Date de naissance</li>
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données professionnelles (organisateurs) :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li>Nom de l'entreprise</li>
          <li>Numéro SIRET</li>
          <li>Adresse de l'entreprise</li>
          <li>Description de l'activité</li>
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données techniques :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li>Adresse IP</li>
          <li>Type de navigateur</li>
          <li>Pages visitées</li>
          <li>Cookies</li>
        </ul>
      </div>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">3. Utilisation des données</h3>
      <p className="text-sm text-gray-600 mb-2">Vos données sont utilisées pour :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Gérer votre compte utilisateur</li>
        <li>Traiter vos commandes et paiements</li>
        <li>Générer et délivrer vos billets</li>
        <li>Vous envoyer des notifications importantes</li>
        <li>Améliorer nos services</li>
        <li>Respecter nos obligations légales</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">4. Vos droits (RGPD)</h3>
      <p className="text-sm text-gray-600 mb-2">Vous disposez des droits suivants :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li><strong>Droit d'accès :</strong> Connaître les données que nous détenons</li>
        <li><strong>Droit de rectification :</strong> Corriger des données inexactes</li>
        <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</li>
        <li><strong>Droit de portabilité :</strong> Récupérer vos données</li>
        <li><strong>Droit d'opposition :</strong> Vous opposer au traitement</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">5. Conservation des données</h3>
      <p className="text-sm text-gray-600 mb-2">Durées de conservation :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Données de compte : Jusqu'à suppression + 3 ans</li>
        <li>Données de transaction : 10 ans (obligations comptables)</li>
        <li>Données de navigation : 13 mois maximum</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">6. Sécurité</h3>
      <p className="text-sm text-gray-600 mb-3">
        Nous mettons en place des mesures techniques et organisationnelles pour protéger vos données : 
        chiffrement, accès limité, surveillance, sauvegardes régulières.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">7. Contact</h3>
      <p className="text-sm text-gray-600 mb-3">
        Pour exercer vos droits ou pour toute question : <strong>privacy@billetterie.com</strong>
      </p>
      <p className="text-sm text-gray-600 mb-3">
        Réclamations : Vous pouvez déposer une réclamation auprès de la CNIL.
      </p>
    </section>

    <div className="mt-6 pt-4 border-t">
      <p className="text-xs text-gray-500">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>
    </div>
  </div>
)

export function LegalModal({ type, trigger }: LegalModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const config = {
    terms: {
      title: "Conditions d'utilisation",
      content: <TermsContent />
    },
    privacy: {
      title: "Politique de confidentialité",
      content: <PrivacyContent />
    }
  }

  const { title, content } = config[type]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh] max-h-[600px] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TermsModal({ trigger }: { trigger: React.ReactNode }) {
  return <LegalModal type="terms" trigger={trigger} />
}

export function PrivacyModal({ trigger }: { trigger: React.ReactNode }) {
  return <LegalModal type="privacy" trigger={trigger} />
}