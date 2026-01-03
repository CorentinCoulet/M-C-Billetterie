'use client'

import { List, X } from '@phosphor-icons/react'
import Image from 'next/image'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Button } from '../ui/button'

interface HeaderProps {
  navigate: (page: string, eventId?: number) => void
  currentPage?: string
  currentUser?: any
  favorites?: number[]
  cart?: any[]
  logout?: () => void
}

export function Header({ navigate, currentPage, currentUser, favorites = [], logout }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { cart } = useApp() // Use cart from context

  // Close mobile menu on navigation
  const handleNavigate = (page: string) => {
    navigate(page)
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    if (logout) logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b-2 border-white/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 md:space-x-8">
            <div 
              className="flex items-center space-x-2 cursor-pointer group" 
              onClick={() => handleNavigate('home')}
            >
              <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                <Image 
                  src="/logo4.webp" 
                  alt="Billetterie Logo" 
                  width={80} 
                  height={80}
                  priority
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent group-hover:scale-105 transition-all duration-300" style={{ fontSize: '1.2rem' }}>
                Billetterie
              </h1>
            </div>
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
              {currentUser && (
                <Button 
                  variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                  onClick={() => handleNavigate('dashboard')}
                  className={
                    currentPage === 'dashboard' 
                      ? 'glass-button font-semibold' 
                      : 'font-semibold hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-600/20 hover:text-purple-600 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 focus:bg-gradient-to-r focus:from-purple-500/20 focus:to-pink-600/20 focus:text-purple-600 focus:scale-105 focus:shadow-lg focus:shadow-purple-500/20 focus:ring-2 focus:ring-purple-400/50 transition-all duration-300 ease-in-out'
                  }
                  style={{ fontSize: '1.2rem' }}
                >
                  🎯 Dashboard
                </Button>
              )}
              <Button 
                variant={currentPage === 'events' ? 'default' : 'ghost'}
                onClick={() => handleNavigate('events')}
                className={
                  currentPage === 'events' 
                    ? 'glass-button font-semibold' 
                    : 'font-semibold hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 focus:bg-gradient-to-r focus:from-primary/20 focus:to-blue-600/20 focus:text-primary focus:scale-105 focus:shadow-lg focus:shadow-blue-500/20 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ease-in-out'
                }
                style={{ fontSize: '1.2rem' }}
              >
                Événements
              </Button>
              <Button 
                variant={currentPage === 'about' ? 'default' : 'ghost'}
                onClick={() => handleNavigate('about')}
                className={
                  currentPage === 'about' 
                    ? 'glass-button font-semibold' 
                    : 'font-semibold hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 focus:bg-gradient-to-r focus:from-primary/20 focus:to-blue-600/20 focus:text-primary focus:scale-105 focus:shadow-lg focus:shadow-blue-500/20 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ease-in-out'
                }
                style={{ fontSize: '1.2rem' }}
              >
                À propos
              </Button>
            </nav>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2 md:space-x-4">
            {currentUser ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => handleNavigate('cart')}
                  className="font-semibold hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 ease-in-out group px-3 md:px-4"
                  style={{ fontSize: '1.2rem' }}
                >
                  <span className="relative inline-flex items-center">
                    <span>🛒</span>
                    {cart.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white">
                        {cart.length}
                      </span>
                    )}
                  </span>
                  <span className="ml-2">Panier</span>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => handleNavigate('profile')}
                  className="font-semibold hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 focus:bg-gradient-to-r focus:from-primary/20 focus:to-blue-600/20 focus:text-primary focus:scale-105 focus:shadow-lg focus:shadow-blue-500/20 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ease-in-out px-3 md:px-4"
                  style={{ fontSize: '1.2rem' }}
                >
                  👤 Profil
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="font-semibold hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 px-3 md:px-4"
                  style={{ fontSize: '1.2rem' }}
                >
                  🚪 Déconnexion
                </Button>
              </>
            ) : (
              <Button onClick={() => handleNavigate('auth')} className="glass-button font-semibold hover:scale-105 hover:-translate-y-0.5 transition-all duration-300" style={{ fontSize: '1.2rem' }}>
                Connexion
              </Button>
            )}
          </div>

          {/* Mobile Burger Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-primary hover:bg-primary/10 transition-all"
            >
              {isMobileMenuOpen ? (
                <X size={28} weight="bold" />
              ) : (
                <List size={28} weight="bold" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] glass-card border-l-2 border-white/40 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Close Button */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Menu
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-primary hover:bg-primary/10"
            >
              <X size={24} weight="bold" />
            </Button>
          </div>

          {/* Menu Items */}
          <nav className="flex flex-col space-y-4 flex-1">
            {currentUser && (
              <Button 
                variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => handleNavigate('dashboard')}
                className={`justify-start text-lg font-semibold ${
                  currentPage === 'dashboard'
                    ? 'glass-button'
                    : 'hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-600/20 hover:text-purple-600'
                }`}
              >
                🎯 Dashboard
              </Button>
            )}
            <Button 
              variant={currentPage === 'events' ? 'default' : 'ghost'}
              onClick={() => handleNavigate('events')}
              className={`justify-start text-lg font-semibold ${
                currentPage === 'events'
                  ? 'glass-button'
                  : 'hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary'
              }`}
            >
              🎉 Événements
            </Button>

            <Button 
              variant={currentPage === 'about' ? 'default' : 'ghost'}
              onClick={() => handleNavigate('about')}
              className={`justify-start text-lg font-semibold ${
                currentPage === 'about'
                  ? 'glass-button'
                  : 'hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary'
              }`}
            >
              ℹ️ À propos
            </Button>

            {currentUser ? (
              <>
                <div className="border-t border-white/20 my-2"></div>
                
                <Button 
                  variant="ghost"
                  onClick={() => handleNavigate('cart')}
                  className="justify-start text-lg font-semibold hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary relative"
                >
                  🛒 Panier
                  {cart.length > 0 && (
                    <span className="ml-auto bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                      {cart.length}
                    </span>
                  )}
                </Button>

                <Button 
                  variant="ghost"
                  onClick={() => handleNavigate('profile')}
                  className="justify-start text-lg font-semibold hover:bg-gradient-to-r hover:from-primary/20 hover:to-blue-600/20 hover:text-primary"
                >
                  👤 Profil
                </Button>

                <div className="border-t border-white/20 my-2"></div>

                <Button 
                  variant="ghost"
                  onClick={handleLogout}
                  className="justify-start text-lg font-semibold hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600"
                >
                  🚪 Déconnexion
                </Button>
              </>
            ) : (
              <>
                <div className="border-t border-white/20 my-2"></div>
                <Button 
                  onClick={() => handleNavigate('auth')} 
                  className="glass-button text-lg font-semibold justify-start"
                >
                  🔐 Connexion
                </Button>
              </>
            )}
          </nav>

          {/* Footer Info */}
          <div className="mt-auto pt-6 border-t border-white/20">
            <p className="text-sm text-muted-foreground text-center">
              Billetterie © 2025
            </p>
          </div>
        </div>
      </div>
    </>
  )
}