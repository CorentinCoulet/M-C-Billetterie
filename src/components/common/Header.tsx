'use client'

import Image from 'next/image'
import { Button } from '../ui/button'

interface HeaderProps {
  navigate: (page: string, eventId?: number) => void
  currentPage?: string
  currentUser?: any
  favorites?: number[]
  cart?: any[]
  logout?: () => void
}

export function Header({ navigate, currentPage, currentUser, favorites = [], cart = [], logout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b-2 border-white/40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div 
            className="flex items-center space-x-2 cursor-pointer group" 
            onClick={() => navigate('home')}
          >
            <div className="relative w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <Image 
                src="/logo4.webp" 
                alt="Billetterie Logo" 
                width={80} 
                height={80}
                className="h-full w-full object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent group-hover:scale-105 transition-all duration-300">
              Billetterie
            </h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Button 
              variant={currentPage === 'events' ? 'default' : 'ghost'}
              onClick={() => navigate('events')}
              className={
                currentPage === 'events' 
                  ? 'glass-button text-base' 
                  : 'text-base hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 focus:bg-gradient-to-r focus:from-primary/20 focus:to-blue-600/20 focus:text-primary focus:scale-105 focus:shadow-lg focus:shadow-blue-500/20 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ease-in-out'
              }
            >
              Événements
            </Button>
            <Button 
              variant={currentPage === 'about' ? 'default' : 'ghost'}
              onClick={() => navigate('about')}
              className={
                currentPage === 'about' 
                  ? 'glass-button text-base' 
                  : 'text-base hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 focus:bg-gradient-to-r focus:from-primary/20 focus:to-blue-600/20 focus:text-primary focus:scale-105 focus:shadow-lg focus:shadow-blue-500/20 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ease-in-out'
              }
            >
              À propos
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate('cart')}
                className="relative hover:bg-white/20"
              >
                Panier ({cart.length})
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('profile')}
                className="hover:bg-white/20"
              >
                Profil
              </Button>
              <Button 
                variant="outline" 
                onClick={logout}
                className="border-white/40 hover:bg-white/20"
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate('auth')} className="glass-button hover:scale-105 hover:-translate-y-0.5 transition-all duration-300">
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}