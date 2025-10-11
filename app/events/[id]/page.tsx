'use client'

import { ArrowLeft, CalendarBlank, Clock, Heart, MapPin, Minus, Plus, Star, Users } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '../../../src/components/ui/badge'
import { Button } from '../../../src/components/ui/button'
import { Label } from '../../../src/components/ui/label'
import { Separator } from '../../../src/components/ui/separator'

// Event types and data
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

// Event data (to be replaced by API call later)
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

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = parseInt(params.id as string)
  const event = events.find(e => e.id === eventId)
  
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [cart, setCart] = useState<any[]>([])

  const navigate = (page: string, eventId?: number) => {
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
        toast.success('Retiré des favoris')
        return currentFavorites.filter(id => id !== eventId)
      } else {
        toast.success('Ajouté aux favoris')
        return [...currentFavorites, eventId]
      }
    })
  }

  const addToCart = (eventId: number, quantity = 1) => {
    if (!currentUser) {
      toast.error('Veuillez vous connecter pour ajouter au panier')
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
    toast.success(`${quantity > 1 ? `${quantity} billets ajoutés` : 'Billet ajouté'} au panier`)
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="glass-card rounded-2xl p-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Événement non trouvé</h1>
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
