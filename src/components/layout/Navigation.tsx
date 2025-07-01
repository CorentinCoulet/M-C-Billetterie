'use client';

import { CartButton } from '@/components/cart/CartSidebar';
import { Button } from '@/components/ui/button';
import {
    Menu,
    Search,
    Ticket,
    User,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Ticket className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Billetterie</span>
          </Link>

          {/* Menu desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Événements
            </Link>
            <Link 
              href="/demo" 
              className="text-gray-700 hover:text-blue-600 transition-colors font-semibold"
            >
              🧪 Démo
            </Link>
            <Link 
              href="/qr-scanner" 
              className="text-gray-700 hover:text-blue-600 transition-colors font-semibold"
            >
              📱 Scanner QR
            </Link>
            <Link 
              href="/admin/qr-rotation" 
              className="text-gray-700 hover:text-blue-600 transition-colors font-semibold"
            >
              ⚙️ Admin QR
            </Link>
            <Link 
              href="/categories" 
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Catégories
            </Link>
            <Link 
              href="/organizers" 
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Organisateurs
            </Link>
          </div>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            
            <CartButton />
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">
                <User className="h-4 w-4 mr-2" />
                Connexion
              </Link>
            </Button>
          </div>

          {/* Menu mobile button */}
          <div className="md:hidden flex items-center space-x-2">
            <CartButton />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {isOpen && (
          <div className="md:hidden border-t">
            <div className="py-4 space-y-4">
              <Link 
                href="/" 
                className="block text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Événements
              </Link>
              <Link 
                href="/demo" 
                className="block text-gray-700 hover:text-blue-600 transition-colors font-semibold"
                onClick={() => setIsOpen(false)}
              >
                🧪 Démo
              </Link>
              <Link 
                href="/qr-scanner" 
                className="block text-gray-700 hover:text-blue-600 transition-colors font-semibold"
                onClick={() => setIsOpen(false)}
              >
                📱 Scanner QR
              </Link>
              <Link 
                href="/admin/qr-rotation" 
                className="block text-gray-700 hover:text-blue-600 transition-colors font-semibold"
                onClick={() => setIsOpen(false)}
              >
                ⚙️ Admin QR
              </Link>
              <Link 
                href="/categories" 
                className="block text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Catégories
              </Link>
              <Link 
                href="/organizers" 
                className="block text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Organisateurs
              </Link>
              <hr />
              <Link 
                href="/auth" 
                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4 mr-2" />
                Connexion
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
