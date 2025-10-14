'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EventsPage as FrontendEventsPage } from '../../src/components/EventsPage'

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

interface DbEvent {
  id: string
  title: string
  description: string | null
  date: string
  location: string
  maxCapacity: number | null
  isPublished: boolean
  category?: {
    id: string
    name: string
  } | null
  venue?: {
    id: string
    name: string
  } | null
  tickets?: Array<{
    id: string
    status: string
    order: {
      id: string
      totalPrice: number
    } | null
  }>
  reviews?: Array<{
    id: string
    rating: number
  }>
}

const getCategoryEmoji = (categoryName?: string): string => {
  if (!categoryName) return '🎫'
  
  const categoryMap: Record<string, string> = {
    'Musique': '🎼',
    'Concert': '🎸',
    'Festival': '🎉',
    'Danse': '💃',
    'Théâtre': '🎭',
    'Sport': '⚽',
    'Conférence': '🎤',
    'Exposition': '🖼️',
    'Cinéma': '🎬'
  }

  return categoryMap[categoryName] || '🎫'
}

const transformDbEventToFrontend = (dbEvent: DbEvent): Event => {
  const eventDate = new Date(dbEvent.date)
  
  const ticketsWithPrice = dbEvent.tickets?.filter(ticket => ticket.order?.totalPrice) || []
  const averagePrice = ticketsWithPrice.length > 0
    ? ticketsWithPrice.reduce((sum, ticket) => sum + (ticket.order?.totalPrice || 0), 0) / ticketsWithPrice.length
    : 0
  
  const averageRating = dbEvent.reviews && dbEvent.reviews.length > 0
    ? dbEvent.reviews.reduce((sum, review) => sum + review.rating, 0) / dbEvent.reviews.length
    : 0

  return {
    id: parseInt(dbEvent.id.slice(-8), 16) || Math.floor(Math.random() * 10000),
    name: dbEvent.title,
    date: eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    location: dbEvent.location,
    price: averagePrice > 0 ? `${averagePrice.toFixed(0)}€` : 'Gratuit',
    category: dbEvent.category?.name || 'Non catégorisé',
    image: getCategoryEmoji(dbEvent.category?.name),
    available: dbEvent.maxCapacity || 0,
    description: dbEvent.description || 'Aucune description disponible',
    venue: dbEvent.venue?.name || dbEvent.location,
    duration: '2h',
    rating: Math.round(averageRating * 10) / 10,
    reviews: dbEvent.reviews?.length || 0
  }
}

export default function EventsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events?orderBy=date')
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des événements')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          const transformedEvents = result.data.map(transformDbEventToFrontend)
          setEvents(transformedEvents)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des événements:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des événements...</p>
        </div>
      </div>
    )
  }

  if (!loading && events.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Aucun événement en cours</h2>
          <p className="text-gray-600 mb-2">Il n'y a actuellement aucun événement programmé.</p>
          <p className="text-gray-500 text-sm mb-6">Revenez régulièrement pour découvrir nos prochains événements !</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
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
  )
}
