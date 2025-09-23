'use client'

import { Button } from '../ui/button'

interface FooterProps {
  navigate: (page: string) => void
}

export function Footer({ navigate }: FooterProps) {
  return (
    <footer className="bg-slate-100 dark:bg-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Billetterie</h3>
            <p className="text-muted-foreground">
              Votre plateforme de réservation d'événements
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Navigation</h4>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('events')} className="p-0 h-auto">
                Événements
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('about')} className="p-0 h-auto">
                À propos
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('contact')} className="p-0 h-auto">
                Contact
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('faq')} className="p-0 h-auto">
                FAQ
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('help')} className="p-0 h-auto">
                Aide
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                Conditions d'utilisation
              </Button>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                Politique de confidentialité
              </Button>
            </div>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2025 Billetterie. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}