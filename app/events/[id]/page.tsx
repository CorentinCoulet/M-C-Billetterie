'use client'

import { ArrowLeft, CalendarBlank, Clock, Heart, MapPin, Minus, Plus, Star, Users } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '../../../src/components/ui/badge'
import { Button } from '../../../src/components/ui/button'
import { Label } from '../../../src/components/ui/label'
import { Separator } from '../../../src/components/ui/separator'
import { useApp } from '../../../src/context/AppContext'

// Event types and data
interface Event {
  id: string
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

const getCategoryDisplayName = (categoryName?: string): string => {
  if (!categoryName) return 'Non catégorisé'
  
  const categoryTranslations: Record<string, string> = {
    'MUSIC': 'Musique',
    'CONCERT': 'Concert',
    'FESTIVAL': 'Festival',
    'DANCE': 'Danse',
    'THEATER': 'Théâtre',
    'SPORTS': 'Sport',
    'CONFERENCE': 'Conférence',
    'EXHIBITION': 'Exposition',
    'CINEMA': 'Cinéma',
    'FOOD': 'Gastronomie'
  }

  return categoryTranslations[categoryName.toUpperCase()] || categoryName
}

const getCategoryEmoji = (categoryName?: string): string => {
  if (!categoryName) return '🎫'
  
  const frenchCategory = getCategoryDisplayName(categoryName)
  
  const categoryMap: Record<string, string> = {
    'Musique': '🎼',
    'Concert': '🎸',
    'Festival': '🎉',
    'Danse': '💃',
    'Théâtre': '🎭',
    'Sport': '⚽',
    'Conférence': '🎤',
    'Exposition': '🖼️',
    'Cinéma': '�',
    'Gastronomie': '🍽️'
  }

  return categoryMap[frenchCategory] || '🎫'
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
    id: dbEvent.id,
    name: dbEvent.title,
    date: eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    location: dbEvent.location,
    price: averagePrice > 0 ? `${averagePrice.toFixed(0)}€` : 'Gratuit',
    category: getCategoryDisplayName(dbEvent.category?.name),
    image: getCategoryEmoji(dbEvent.category?.name),
    available: dbEvent.maxCapacity || 0,
    description: dbEvent.description || 'Aucune description disponible',
    venue: dbEvent.venue?.name || dbEvent.location,
    duration: '2h',
    rating: Math.round(averageRating * 10) / 10,
    reviews: dbEvent.reviews?.length || 0
  }
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser, addToCart: addToCartContext } = useApp()
  const eventId = params.id as string
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/events/${eventId}`)
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'événement')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          const transformedEvent = transformDbEventToFrontend(result.data)
          setEvent(transformedEvent)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'événement:', error)
        toast.error('Événement non trouvé')
        router.push('/events')
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      fetchEvent()
    }
  }, [eventId, router])

  const navigate = (page: string, eventId?: string) => {
    switch (page) {
      case 'events':
        router.push('/events')
        break
      case 'cart':
        router.push('/cart')
        break
      case 'auth':
        router.push('/login')
        break
      case 'dashboard':
        router.push('/dashboard')
        break
      default:
        router.push(`/${page}`)
    }
  }

  const toggleFavorite = (eventId: string) => {
    setFavorites((currentFavorites: string[]) => {
      const isFavorite = currentFavorites.includes(eventId)
      if (isFavorite) {
        toast.success('Retiré des favoris')
        return currentFavorites.filter(id => id !== eventId)
      } else {
        toast.success('Ajouté aux favoris')
        return [...currentFavorites, eventId]
      }
    })
  }

  const addToCart = async (eventId: string, quantity = 1) => {
    if (!currentUser) {
      toast.error('Veuillez vous connecter pour ajouter au panier')
      router.push('/login')
      return
    }
    
    if (!event) return
    
    const price = parseFloat(event.price.replace('€', '').replace('Gratuit', '0'))
    
    await addToCartContext({
      eventId,
      eventName: event.name,
      quantity,
      price
    })
    
    toast.success(`${quantity > 1 ? `${quantity} billets ajoutés` : 'Billet ajouté'} au panier`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'événement...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Événement non trouvé</h1>
          <p className="text-muted-foreground mb-6">L'événement que vous recherchez n'existe pas ou n'est plus disponible.</p>
          <Button onClick={() => navigate('events')} className="glass-button text-white font-semibold">
            Retour aux événements
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            onClick={() => navigate('events')}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} className="mr-2" />
            Retour aux événements
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="text-6xl">{event.image}</div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{event.name}</h1>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="font-medium">{event.rating}</span>
                        <span className="text-muted-foreground">({event.reviews} avis)</span>
                      </div>
                      <Badge variant="secondary">{event.category}</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => toggleFavorite(event.id)}
                  variant="ghost"
                  size="lg"
                  className={`p-3 ${favorites.includes(event.id) ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                >
                  <Heart size={24} fill={favorites.includes(event.id) ? 'currentColor' : 'none'} />
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="glass-card rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                    <CalendarBlank size={20} />
                    <span className="font-medium">Date & Heure</span>
                  </div>
                  <p className="text-foreground font-semibold">{event.date}</p>
                  <p className="text-muted-foreground">{event.time}</p>
                </div>
                
                <div className="glass-card rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                    <MapPin size={20} />
                    <span className="font-medium">Lieu</span>
                  </div>
                  <p className="text-foreground font-semibold">{event.location}</p>
                  <p className="text-muted-foreground">{event.venue}</p>
                </div>
                
                <div className="glass-card rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                    <Clock size={20} />
                    <span className="font-medium">Durée</span>
                  </div>
                  <p className="text-foreground font-semibold">{event.duration}</p>
                  <p className="text-muted-foreground">Avec entracte</p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </div>

              <div className="glass-card rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Informations pratiques</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Places disponibles :</span>
                    <span className="ml-2 text-foreground font-semibold">{event.available}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Catégorie :</span>
                    <span className="ml-2 text-foreground font-semibold">{event.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lieu complet :</span>
                    <span className="ml-2 text-foreground font-semibold">{event.venue}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Durée totale :</span>
                    <span className="ml-2 text-foreground font-semibold">{event.duration}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 sticky top-28"
            >
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-primary mb-2">{event.price}</div>
                <p className="text-muted-foreground">par personne</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Nombre de places
                  </Label>
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                      variant="outline"
                      size="sm"
                      className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/70"
                      disabled={selectedQuantity <= 1}
                    >
                      <Minus size={16} />
                    </Button>
                    <span className="flex-1 text-center font-semibold text-foreground">
                      {selectedQuantity}
                    </span>
                    <Button
                      onClick={() => setSelectedQuantity(Math.min(8, selectedQuantity + 1))}
                      variant="outline"
                      size="sm"
                      className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/70"
                      disabled={selectedQuantity >= 8}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {(parseFloat(event.price.replace('€', '')) * selectedQuantity).toFixed(0)}€
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => addToCart(event.id, selectedQuantity)}
                  className="w-full glass-button text-white font-semibold py-3"
                >
                  Ajouter au panier
                </Button>
                <Button
                  onClick={() => {
                    if (!currentUser) {
                      toast.error('Veuillez vous connecter pour réserver')
                      router.push('/login')
                      return
                    }
                    addToCart(event.id, selectedQuantity)
                    navigate('cart')
                  }}
                  variant="outline"
                  className="w-full border-border bg-card/50 backdrop-blur-sm hover:bg-card/70"
                >
                  Réserver maintenant
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Users size={16} />
                  <span>{event.available} places restantes</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
  )
}
