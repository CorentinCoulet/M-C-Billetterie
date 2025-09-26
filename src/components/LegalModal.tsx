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
      <h3 className="text-lg font-semibold mb-3">1. Objet et acceptation</h3>
      <p className="text-sm text-gray-600 mb-3">
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation 
        de la plateforme de billetterie électronique. L'utilisation de nos services implique 
        l'acceptation pleine et entière de ces conditions. Tout accès ou utilisation de la plateforme 
        emporte acceptation expresse et sans réserve des présentes CGU.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">2. Description des services</h3>
      <p className="text-sm text-gray-600 mb-3">
        La plateforme propose un service de billetterie électronique permettant la mise en relation 
        entre organisateurs d'événements et acheteurs de billets. Nous agissons en qualité 
        d'intermédiaire technique et commercial.
      </p>
      <p className="text-sm text-gray-600 mb-2">Nos services comprennent notamment :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Plateforme de création et de gestion d'événements</li>
        <li>Système de vente de billets dématérialisés</li>
        <li>Solutions de paiement sécurisées certifiées PCI-DSS</li>
        <li>Génération automatique de billets électroniques avec codes QR uniques</li>
        <li>Système de notifications et de rappels automatisés</li>
        <li>Outils de contrôle d'accès et de validation</li>
        <li>Services de support client</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">3. Conditions d'accès et inscription</h3>
      <p className="text-sm text-gray-600 mb-3">
        L'accès aux services nécessite la création d'un compte utilisateur. L'utilisateur garantit 
        l'exactitude, la sincérité et la mise à jour des informations communiquées. Il est seul 
        responsable de la confidentialité de ses identifiants et de toute utilisation de son compte.
      </p>
      <p className="text-sm text-gray-600 mb-2">L'utilisateur s'engage à :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Fournir des informations complètes, exactes et sincères</li>
        <li>Procéder à la mise à jour régulière de ses données personnelles</li>
        <li>Préserver la confidentialité de ses codes d'accès</li>
        <li>Signaler immédiatement toute utilisation frauduleuse de son compte</li>
        <li>Ne créer qu'un seul compte par personne physique ou morale</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">4. Règles d'utilisation et interdictions</h3>
      <p className="text-sm text-gray-600 mb-2">L'utilisateur s'interdit formellement de :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li>Utiliser la plateforme à des fins illicites ou contraires à l'ordre public</li>
        <li>Porter atteinte aux droits de tiers ou troubler la tranquillité d'autrui</li>
        <li>Diffuser des contenus illégaux, diffamatoires, discriminatoires ou malveillants</li>
        <li>Compromettre la sécurité ou le fonctionnement de la plateforme</li>
        <li>Usurper l'identité d'autrui ou créer de faux profils</li>
        <li>Procéder à des achats spéculatifs ou à la revente non autorisée de billets</li>
        <li>Utiliser des moyens automatisés pour accéder aux services (bots, scripts)</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">5. Modalités d'achat et conditions commerciales</h3>
      <p className="text-sm text-gray-600 mb-3">
        La vente est réputée conclue lors de la validation du paiement et de l'émission du billet électronique. 
        Les prix sont indiqués en euros, toutes taxes comprises. Les modalités de remboursement, 
        d'échange ou d'annulation sont définies par l'organisateur de l'événement et précisées 
        lors de l'achat.
      </p>
      <p className="text-sm text-gray-600 mb-3">
        L'acheteur reconnaît que le billet est strictement personnel et nominatif. 
        Toute revente non autorisée peut entraîner l'annulation du billet sans remboursement.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">6. Propriété intellectuelle</h3>
      <p className="text-sm text-gray-600 mb-3">
        L'ensemble des éléments de la plateforme (structure, design, contenus, marques, logos, 
        codes sources) constituent des œuvres protégées par les dispositions du Code de la 
        propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation 
        non expressément autorisée constitue une contrefaçon sanctionnée pénalement.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">7. Responsabilité et garanties</h3>
      <p className="text-sm text-gray-600 mb-3">
        Notre responsabilité est limitée aux dommages directs et prévisibles dans la limite 
        du montant des sommes effectivement perçues. Nous déclinons toute responsabilité 
        concernant les événements eux-mêmes, leur déroulement, leur annulation ou leur report, 
        relevant de la seule responsabilité des organisateurs.
      </p>
      <p className="text-sm text-gray-600 mb-3">
        Nous ne saurions être tenus responsables des dysfonctionnements imputables aux réseaux 
        de télécommunications, aux fournisseurs d'accès internet ou à des événements de force majeure.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">8. Données personnelles et confidentialité</h3>
      <p className="text-sm text-gray-600 mb-3">
        Le traitement des données personnelles est régi par notre Politique de Confidentialité, 
        conforme au Règlement Général sur la Protection des Données (RGPD). Les utilisateurs 
        disposent de droits d'accès, de rectification, d'effacement et de portabilité sur leurs données.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">9. Modification et résiliation</h3>
      <p className="text-sm text-gray-600 mb-3">
        Nous nous réservons le droit de modifier les présentes conditions à tout moment. 
        Les utilisateurs seront informés de toute modification substantielle par notification. 
        L'accès aux services peut être suspendu ou résilié en cas de non-respect des présentes conditions.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">10. Droit applicable et juridiction</h3>
      <p className="text-sm text-gray-600 mb-3">
        Les présentes conditions sont régies par le droit français. Tout litige relève de la 
        compétence exclusive des tribunaux français. Conformément aux dispositions du Code de la 
        consommation, le consommateur peut recourir gratuitement à un médiateur de la consommation.
      </p>
    </section>

    <div className="mt-6 pt-4 border-t">
      <p className="text-xs text-gray-500">
        Version en vigueur : 2.1 - Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>
    </div>
  </div>
)

const PrivacyContent = () => (
  <div className="space-y-6">
    <section>
      <h3 className="text-lg font-semibold mb-3">1. Responsable du traitement et délégué à la protection des données</h3>
      <p className="text-sm text-gray-600 mb-3">
        La présente Politique de Protection des Données Personnelles a pour objet d'informer les utilisateurs 
        des traitements de données personnelles mis en œuvre dans le cadre des services de billetterie électronique, 
        en conformité avec le Règlement Général sur la Protection des Données (RGPD) n°2016/679 
        et la loi Informatique et Libertés modifiée.
      </p>
      <p className="text-sm text-gray-600 mb-3">
        <strong>Contact du délégué à la protection des données :</strong> dpo@billetterie.com
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">2. Catégories de données collectées et bases légales</h3>
      
      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données d'identification et de contact :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-2">
          <li>Nom, prénom, pseudonyme</li>
          <li>Adresse de courrier électronique</li>
          <li>Numéro de téléphone mobile</li>
          <li>Date de naissance (vérification d'âge pour certains événements)</li>
          <li>Adresse postale (facturation et livraison)</li>
        </ul>
        <p className="text-xs text-gray-500 mb-3">
          <strong>Base légale :</strong> Exécution du contrat et intérêt légitime
        </p>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données professionnelles (organisateurs d'événements) :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-2">
          <li>Dénomination sociale et forme juridique</li>
          <li>Numéro SIRET et code APE</li>
          <li>Adresse du siège social</li>
          <li>Coordonnées du représentant légal</li>
          <li>Numéro de TVA intracommunautaire</li>
          <li>Informations bancaires (RIB/IBAN)</li>
        </ul>
        <p className="text-xs text-gray-500 mb-3">
          <strong>Base légale :</strong> Obligation légale et exécution du contrat
        </p>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données de transaction et financières :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-2">
          <li>Données de paiement (cryptées et tokenisées)</li>
          <li>Historique des commandes et factures</li>
          <li>Préférences d'achat et comportements de consommation</li>
        </ul>
        <p className="text-xs text-gray-500 mb-3">
          <strong>Base légale :</strong> Exécution du contrat et obligations comptables
        </p>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-sm mb-2">Données techniques et de navigation :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-2">
          <li>Adresses IP et données de géolocalisation approximative</li>
          <li>Identifiants de session et cookies techniques</li>
          <li>Données de navigation (pages consultées, durée de visite)</li>
          <li>Caractéristiques techniques (navigateur, système d'exploitation)</li>
        </ul>
        <p className="text-xs text-gray-500 mb-3">
          <strong>Base légale :</strong> Intérêt légitime et consentement (cookies non essentiels)
        </p>
      </div>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">3. Finalités et licéité des traitements</h3>
      <p className="text-sm text-gray-600 mb-2">Les données personnelles sont traitées aux fins suivantes :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li><strong>Gestion des comptes utilisateurs</strong> et authentification sécurisée</li>
        <li><strong>Traitement des commandes</strong> et émission des billets électroniques</li>
        <li><strong>Exécution des paiements</strong> et lutte contre la fraude</li>
        <li><strong>Communication contractuelle</strong> et notifications de service</li>
        <li><strong>Support client</strong> et gestion des réclamations</li>
        <li><strong>Respect des obligations légales</strong> (comptabilité, fiscalité, lutte anti-blanchiment)</li>
        <li><strong>Amélioration des services</strong> et analyses statistiques anonymisées</li>
        <li><strong>Marketing direct</strong> avec consentement préalable</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibond mb-3">4. Vos droits fondamentaux</h3>
      <p className="text-sm text-gray-600 mb-2">Conformément au RGPD, vous bénéficiez des droits suivants :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li><strong>Droit d'information</strong> sur les traitements (articles 13 et 14)</li>
        <li><strong>Droit d'accès</strong> aux données vous concernant (article 15)</li>
        <li><strong>Droit de rectification</strong> des données inexactes (article 16)</li>
        <li><strong>Droit à l'effacement</strong> dans les cas prévus par la loi (article 17)</li>
        <li><strong>Droit à la limitation</strong> du traitement (article 18)</li>
        <li><strong>Droit à la portabilité</strong> des données (article 20)</li>
        <li><strong>Droit d'opposition</strong> au traitement (article 21)</li>
        <li><strong>Droit de ne pas faire l'objet d'une décision automatisée</strong> (article 22)</li>
      </ul>
      <p className="text-sm text-gray-600 mb-3">
        <strong>Modalités d'exercice :</strong> Demande écrite accompagnée d'une copie de pièce d'identité 
        à l'adresse : privacy@billetterie.com. Réponse garantie sous 30 jours.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">5. Durées de conservation et archivage</h3>
      <div className="mb-3">
        <h4 className="font-medium text-sm mb-2">Données en base active :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li><strong>Comptes clients :</strong> Jusqu'à suppression du compte + 3 ans</li>
          <li><strong>Prospects non clients :</strong> 3 ans à compter du dernier contact</li>
          <li><strong>Données de paiement :</strong> Suppression immédiate après transaction (tokenisation)</li>
        </ul>
        
        <h4 className="font-medium text-sm mb-2">Archivage intermédiaire :</h4>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
          <li><strong>Factures et données comptables :</strong> 10 ans (Code de commerce)</li>
          <li><strong>Données de connexion :</strong> 1 an (Code des postes et télécommunications)</li>
          <li><strong>Cookies et traceurs :</strong> 13 mois maximum</li>
        </ul>
      </div>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">6. Sécurité et mesures de protection</h3>
      <p className="text-sm text-gray-600 mb-2">Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :</p>
      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-3">
        <li><strong>Chiffrement</strong> SSL/TLS pour tous les échanges de données</li>
        <li><strong>Authentification forte</strong> et contrôle d'accès par rôles</li>
        <li><strong>Surveillance continue</strong> et détection d'intrusions</li>
        <li><strong>Sauvegardes chiffrées</strong> et plans de continuité d'activité</li>
        <li><strong>Formation du personnel</strong> aux bonnes pratiques RGPD</li>
        <li><strong>Audits de sécurité</strong> réguliers par des tiers certifiés</li>
      </ul>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">7. Transferts de données et sous-traitants</h3>
      <p className="text-sm text-gray-600 mb-3">
        Les données personnelles peuvent être transmises à nos sous-traitants techniques 
        (hébergement, paiement, communications) liés par des contrats conformes au RGPD. 
        Aucun transfert vers un pays tiers à l'Union Européenne n'est effectué sans garanties 
        appropriées (décision d'adéquation ou clauses contractuelles types).
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">8. Cookies et technologies similaires</h3>
      <p className="text-sm text-gray-600 mb-3">
        Notre politique de cookies détaillée est accessible via notre bandeau de consentement. 
        Vous pouvez paramétrer vos préférences à tout moment et vous opposer au dépôt 
        de cookies non essentiels au fonctionnement du service.
      </p>
    </section>

    <section>
      <h3 className="text-lg font-semibold mb-3">9. Contact et réclamations</h3>
      <p className="text-sm text-gray-600 mb-3">
        <strong>Délégué à la Protection des Données :</strong><br/>
        Email : dpo@billetterie.com<br/>
        Courrier : DPO - Service Protection des Données<br/>
        Réponse garantie sous 30 jours ouvrés.
      </p>
      <p className="text-sm text-gray-600 mb-3">
        <strong>Autorité de contrôle :</strong> En cas de réponse insatisfaisante, vous pouvez 
        introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) 
        - www.cnil.fr
      </p>
    </section>

    <div className="mt-6 pt-4 border-t">
      <p className="text-xs text-gray-500">
        Version 3.2 - Dernière révision : {new Date().toLocaleDateString('fr-FR')} 
        | Prochaine révision prévue : {new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString('fr-FR')}
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