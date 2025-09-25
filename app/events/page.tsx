'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Background } from '../../src/components/common/Background'
import { Footer } from '../../src/components/common/Footer'
import { Header } from '../../src/components/common/Header'
import { EventsPage as FrontendEventsPage } from '../../src/components/EventsPage'

// Types imported from frontend
interface Event {
  id: number
  name: string
  date: string
  time: string
  location: string
  price: string
  category: string
  image: string
  available: number
  description: string
  venue: string
  duration: string
  rating: number
  reviews: number
}

export default function EventsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [cart, setCart] = useState<any[]>([])

  // Event data - to be replaced with API call later
  const events: Event[] = [
    {
      id: 1,
      name: "Concert de Musique Classique",
      date: "15 Mars 2024",
      time: "20:00",
      location: "Opéra de Paris",
      price: "45€",
      category: "Musique",
      image: "🎼",
      available: 120,
      description: "Une soirée exceptionnelle avec l'Orchestre National dirigé par le célèbre chef d'orchestre Alexandre Dumont. Au programme : Beethoven, Mozart et Chopin dans un cadre prestigieux.",
      venue: "Opéra Bastille, Paris",
      duration: "2h30 (avec entracte)",
      rating: 4.8,
      reviews: 156
    },
    {
      id: 2,
      name: "Festival Jazz d'été",
      date: "22 Juin 2024",
      time: "19:30",
      location: "Parc de la Villette",
      price: "35€",
      category: "Festival",
      image: "🎷",
      available: 250,
      description: "Le plus grand festival de jazz de la capitale revient pour une édition exceptionnelle avec des artistes internationaux et des découvertes françaises.",
      venue: "Grande Halle, Parc de la Villette",
      duration: "4h",
      rating: 4.6,
      reviews: 89
    },
    {
      id: 3,
      name: "Spectacle de Danse Contemporaine",
      date: "8 Avril 2024",
      time: "21:00",
      location: "Théâtre du Châtelet",
      price: "55€",
      category: "Danse",
      image: "💃",
      available: 80,
      description: "Une création originale mêlant danse contemporaine et nouvelles technologies, par la compagnie renommée 'Mouvements Urbains'.",
      venue: "Théâtre du Châtelet",
      duration: "1h45",
      rating: 4.9,
      reviews: 203
    }
  ]

  const navigate = (page: string, eventId?: number) => {
    switch (page) {
      case 'home':
        router.push('/')
        break
      case 'auth':
        router.push('/login')
        break
      case 'event-detail':
        if (eventId) {
          router.push(`/events/${eventId}`)
        }
        break
      case 'cart':
        router.push('/cart')
        break
      case 'profile':
        router.push('/profile')
        break
      default:
        router.push(`/${page}`)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    router.push('/')
  }

  const toggleFavorite = (eventId: number) => {
    setFavorites((currentFavorites: number[]) => {
      const isFavorite = currentFavorites.includes(eventId)
      if (isFavorite) {
        return currentFavorites.filter(id => id !== eventId)
      } else {
        return [...currentFavorites, eventId]
      }
    })
  }

  const addToCart = (eventId: number, quantity = 1) => {
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    setCart((currentCart: any[]) => {
      const existingItem = currentCart.find(item => item.eventId === eventId)
      if (existingItem) {
        return currentCart.map(item =>
          item.eventId === eventId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        return [...currentCart, { eventId, quantity, addedAt: new Date().toISOString() }]
      }
    })
  }

  return (
    <div className="min-h-screen">
      <Background />
      <Header 
        navigate={navigate}
        currentPage="events"
        currentUser={currentUser}
        favorites={favorites}
        cart={cart}
        logout={logout}
      />
      <FrontendEventsPage 
        navigate={navigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        events={events}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        addToCart={addToCart}
      />
      <Footer navigate={navigate} />
    </div>
  )
}
