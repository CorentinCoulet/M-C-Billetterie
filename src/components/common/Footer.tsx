'use client'

import { PrivacyModal, TermsModal } from '../LegalModal'
import { Button } from '../ui/button'

interface FooterProps {
  navigate: (page: string) => void
}

export function Footer({ navigate }: FooterProps) {
  return (
    <footer className="glass-card border-t-2 border-white/40 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Billetterie
            </h3>
            <p className="text-muted-foreground">
              Votre plateforme de réservation d&#39;événements
            </p>
          </div>
          <div className="text-center">
            <h4 className="font-semibold mb-4 text-foreground">Navigation</h4>
            <div className="flex flex-col items-center space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('events')} 
                className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                Événements
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('about')} 
                className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                À propos
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('contact')} 
                className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                Contact
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <div className="flex flex-col items-center space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('faq')} 
                className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                FAQ 
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('help')} 
                className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                Aide
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h4 className="font-semibold mb-4 text-foreground">Légal</h4>
            <div className="flex flex-col items-center space-y-2">
              <TermsModal 
                trigger={
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
                  >
                    Conditions d&#39;utilisation
                  </Button>
                }
              />
              <PrivacyModal 
                trigger={
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-auto text-muted-foreground hover:text-primary hover:scale-105 transition-all duration-200 cursor-pointer"
                  >
                    Politique de confidentialité
                  </Button>
                }
              />
            </div>
          </div>
        </div>
        <div className="border-t border-white/40 mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2025 Billetterie. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}