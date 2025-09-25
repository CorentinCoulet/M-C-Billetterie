'use client'

import { Funnel, Heart, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

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

interface EventsPageProps {
  navigate: (page: string, eventId?: number) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  priceRange: string
  setPriceRange: (range: string) => void
  events: Event[]
  favorites: number[]
  toggleFavorite: (eventId: number) => void
  addToCart: (eventId: number, quantity?: number) => void
}

export function EventsPage({
  navigate,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  events,
  favorites,
  toggleFavorite,
  addToCart
}: EventsPageProps) {
  const categories = ['all', 'Musique', 'Festival', 'Danse', 'Théâtre', 'Sport']
  const priceRanges = ['all', '0-30', '30-60', '60+']

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory
    const eventPrice = parseFloat(event.price.replace('€', ''))
    const matchesPrice = priceRange === 'all' || 
                        (priceRange === '0-30' && eventPrice <= 30) ||
                        (priceRange === '30-60' && eventPrice > 30 && eventPrice <= 60) ||
                        (priceRange === '60+' && eventPrice > 60)
    
    return matchesSearch && matchesCategory && matchesPrice
  })

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">Découvrez nos événements</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trouvez l'événement parfait parmi notre sélection de concerts, festivals et spectacles
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg"
        >
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'Toutes les catégories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Prix" />
              </SelectTrigger>
              <SelectContent>
                {priceRanges.map(range => (
                  <SelectItem key={range} value={range}>
                    {range === 'all' ? 'Tous les prix' : 
                     range === '0-30' ? '0€ - 30€' :
                     range === '30-60' ? '30€ - 60€' : '60€+'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Funnel size={16} />
              <span>Plus de filtres</span>
            </Button>
          </div>
        </motion.div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} trouvé{filteredEvents.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-6xl rounded-t-lg">
                      {event.image}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(event.id)
                      }}
                      variant="ghost"
                      size="sm"
                      className={`absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm ${
                        favorites.includes(event.id) ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Heart size={16} fill={favorites.includes(event.id) ? 'currentColor' : 'none'} />
                    </Button>
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                        {event.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {event.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>📅 {event.date} à {event.time}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>📍 {event.location}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>🎫 {event.available} places disponibles</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-primary">
                        {event.price}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(event.id)
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-white/50 backdrop-blur-sm"
                        >
                          <Plus size={16} className="mr-1" />
                          Panier
                        </Button>
                        <Button
                          onClick={() => navigate('event-detail', event.id)}
                          size="sm"
                        >
                          Détails
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* No results */}
        {filteredEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Aucun événement trouvé</h3>
            <p className="text-muted-foreground mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <Button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setPriceRange('all')
              }}
              variant="outline"
            >
              Réinitialiser les filtres
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}