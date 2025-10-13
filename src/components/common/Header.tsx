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
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center p-1">
              <Image 
                src="/logo4.webp" 
                alt="Billetterie Logo" 
                width={40} 
                height={40}
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Billetterie
            </h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Button 
              variant={currentPage === 'events' ? 'default' : 'ghost'}
              onClick={() => navigate('events')}
              className={currentPage === 'events' ? 'glass-button' : 'hover:bg-white/20'}
            >
              Événements
            </Button>
            <Button 
              variant={currentPage === 'about' ? 'default' : 'ghost'}
              onClick={() => navigate('about')}
              className={currentPage === 'about' ? 'glass-button' : 'hover:bg-white/20'}
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
            <Button onClick={() => navigate('auth')} className="glass-button">
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}