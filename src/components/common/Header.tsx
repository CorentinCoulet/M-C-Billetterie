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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('home')}>
            <Image 
              src="/logo.webp" 
              alt="Billetterie Logo" 
              width={40} 
              height={40}
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-primary">
              Billetterie
            </h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Button 
              variant={currentPage === 'events' ? 'default' : 'ghost'}
              onClick={() => navigate('events')}
            >
              Événements
            </Button>
            <Button 
              variant={currentPage === 'about' ? 'default' : 'ghost'}
              onClick={() => navigate('about')}
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
                className="relative"
              >
                Panier ({cart.length})
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('profile')}
              >
                Profil
              </Button>
              <Button 
                variant="outline" 
                onClick={logout}
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate('auth')}>
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}