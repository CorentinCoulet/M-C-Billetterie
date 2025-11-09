'use client'

import { Funnel, Heart, MagnifyingGlass, ShoppingCartSimple } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

interface Event {
  id: number
  uuid: string
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
  navigate: (page: string, eventId?: number, eventUuid?: string) => void
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
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [sortBy, setSortBy] = useState('date')
  const [dateRange, setDateRange] = useState('all')
  const [addingToCart, setAddingToCart] = useState<number | null>(null)
  
  const handleAddToCart = (eventId: number, eventName: string) => {
    setAddingToCart(eventId)
    addToCart(eventId)
    toast.success(`✅ "${eventName}" ajouté au panier !`, {
      duration: 2500,
      position: 'top-center',
    })
    setTimeout(() => setAddingToCart(null), 800)
  }
  
  // Extract unique categories from events
  const uniqueCategories = Array.from(new Set(events.map(e => e.category).filter(Boolean)))
  const categories = ['all', ...uniqueCategories.sort()]
  const priceRanges = ['all', '0-30', '30-60', '60+']
  const sortOptions = ['date', 'price', 'name', 'popularity']
  const dateRanges = ['all', 'today', 'week', 'month']

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory
    const eventPrice = parseFloat(event.price.replace('€', '').replace('Gratuit', '0'))
    const matchesPrice = priceRange === 'all' || 
                        (priceRange === '0-30' && eventPrice <= 30) ||
                        (priceRange === '30-60' && eventPrice > 30 && eventPrice <= 60) ||
                        (priceRange === '60+' && eventPrice > 60)
    
    // Date range filter
    const eventDate = new Date(event.date)
    const today = new Date()
    const matchesDate = dateRange === 'all' ||
                       (dateRange === 'today' && eventDate.toDateString() === today.toDateString()) ||
                       (dateRange === 'week' && eventDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) ||
                       (dateRange === 'month' && eventDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))
    
    return matchesSearch && matchesCategory && matchesPrice && matchesDate
  }).sort((a, b) => {
    // Sorting logic
    if (sortBy === 'date') {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    } else if (sortBy === 'price') {
      const priceA = parseFloat(a.price.replace('€', '').replace('Gratuit', '0'))
      const priceB = parseFloat(b.price.replace('€', '').replace('Gratuit', '0'))
      return priceA - priceB
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    } else if (sortBy === 'popularity') {
      return b.reviews - a.reviews
    }
    return 0
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
          <div className="glass-card rounded-3xl p-8 sm:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Découvrez nos événements</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Trouvez l'événement parfait parmi notre sélection de concerts, festivals et spectacles
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mb-8"
        >
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white">
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
              <SelectTrigger className="bg-white">
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
            
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 bg-white"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <Funnel size={16} />
              <span>Plus de filtres</span>
            </Button>
          </div>

          {/* Additional filters */}
          <AnimatePresence>
            {showMoreFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Trier par" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option === 'date' ? 'Date' :
                           option === 'price' ? 'Prix' :
                           option === 'name' ? 'Nom' : 'Popularité'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRanges.map(range => (
                        <SelectItem key={range} value={range}>
                          {range === 'all' ? 'Toutes les dates' :
                           range === 'today' ? "Aujourd'hui" :
                           range === 'week' ? 'Cette semaine' : 'Ce mois-ci'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('all')
                      setPriceRange('all')
                      setSortBy('date')
                      setDateRange('all')
                    }}
                    className="bg-white"
                  >
                    Réinitialiser tous les filtres
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <Card className="glass-card group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-white/40">
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
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(event.id, event.name)
                            }}
                            variant="outline"
                            size="sm"
                            disabled={addingToCart === event.id}
                            className="border-white/40 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 hover:text-white hover:border-green-500 transition-all duration-300"
                          >
                            <motion.div
                              animate={addingToCart === event.id ? {
                                rotate: [0, -10, 10, -10, 0],
                                scale: [1, 1.2, 1.2, 1.2, 1]
                              } : {}}
                              transition={{ duration: 0.5 }}
                            >
                              <ShoppingCartSimple size={16} className="mr-1" />
                            </motion.div>
                            {addingToCart === event.id ? 'Ajouté!' : 'Panier'}
                          </Button>
                        </motion.div>
                        <Button
                          onClick={() => navigate('event-detail', event.id, event.uuid)}
                          size="sm"
                          className="glass-button"
                        >
                          Voir
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