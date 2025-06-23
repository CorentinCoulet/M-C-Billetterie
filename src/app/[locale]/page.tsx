import { Calendar, MapPin, Users, Star, ArrowRight, Ticket, TrendingUp, Menu, Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import eventService from '@/services/eventService'
import prisma from '@/lib/prisma'

// Types pour les données
interface EventData {
  id: string
  title: string
  description: string | null
  date: Date
  location: string
  price: number
  category: string
  attendees: number
  rating: number
  organizer: {
    name: string
  }
}

interface CategoryData {
  name: string
  icon: string
  count: number
}

// Fonction pour récupérer les événements à la une
async function getFeaturedEvents(): Promise<EventData[]> {
  try {
    const events = await eventService.getUpcomingEvents(6)
    
    return events.map(event => {
      const statistics = {
        soldTickets: event.tickets?.filter(t => t.status === 'paid').length || 0,
        averageRating: event.reviews?.length > 0 
          ? event.reviews.reduce((sum, review) => sum + review.rating, 0) / event.reviews.length 
          : 4.5
      }

      // Prix simulé basé sur l'ID (en attendant la table des prix)
      const basePrice = parseInt(event.id.slice(-2), 16) || 50
      const price = Math.max(25, Math.min(150, basePrice))

      return {
        id: event.id,
        title: event.title,
        description: event.description || 'Découvrez cet événement exceptionnel',
        date: event.date,
        location: event.location,
        price: price,
        category: event.category?.name || 'Événement',
        attendees: statistics.soldTickets,
        rating: Math.round(statistics.averageRating * 10) / 10,
        organizer: {
          name: event.organizer.name
        }
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error)
    return []
  }
}

// Fonction pour récupérer les catégories avec leurs compteurs - Version corrigée
async function getCategories(): Promise<CategoryData[]> {
  try {
    const categoriesWithCounts = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            events: {
              where: {
                isPublished: true,
                isCancelled: false
              }
            }
          }
        }
      }
    })

    // Mapping des icônes par catégorie - Externaliser plus tard
    const categoryIcons: Record<string, string> = {
      'Musique': '🎵',
      'Technologie': '💻', 
      'Sport': '⚽',
      'Art': '🎨',
      'Gastronomie': '🍽️',
      'Humour': '😄',
      'Cinéma': '🎬',
      'Théâtre': '🎭',
      'Danse': '💃',
      'Culture': '📚',
      'Business': '💼',
      'Formation': '📖',
      'Santé': '⚕️',
      'Nature': '🌿'
    }

    // Correction du typage pour éviter l'erreur TS7006
    return categoriesWithCounts.map((category: any) => ({
      name: category.name,
      icon: categoryIcons[category.name] || '🎪',
      count: category._count.events
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error)
    
    // Fallback cohérent - récupérer toutes les catégories possibles
    const defaultCategories = [
      { name: 'Musique', icon: '🎵', count: 0 },
      { name: 'Technologie', icon: '💻', count: 0 },
      { name: 'Sport', icon: '⚽', count: 0 },
      { name: 'Art', icon: '🎨', count: 0 },
      { name: 'Gastronomie', icon: '🍽️', count: 0 },
      { name: 'Humour', icon: '😄', count: 0 },
      { name: 'Cinéma', icon: '🎬', count: 0 },
      { name: 'Théâtre', icon: '🎭', count: 0 },
      { name: 'Danse', icon: '💃', count: 0 },
      { name: 'Culture', icon: '📚', count: 0 }
    ]
    
    return defaultCategories
  }
}

// Fonction pour récupérer les statistiques globales
async function getGlobalStats() {
  try {
    const [totalEvents, totalUsers, totalTickets] = await Promise.all([
      prisma.event.count({ where: { isPublished: true } }),
      prisma.user.count(),
      prisma.ticket.count({ where: { status: 'paid' } })
    ])

    return {
      events: totalEvents,
      users: totalUsers,
      tickets: totalTickets,
      satisfaction: 4.9
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return {
      events: 0,
      users: 0,
      tickets: 0,
      satisfaction: 4.9
    }
  }
}

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  
  // Récupération des données de la base
  const [featuredEvents, categories, stats] = await Promise.all([
    getFeaturedEvents(),
    getCategories(),
    getGlobalStats()
  ])
  
  // Simulated user state - in real app, this would come from auth context
  const isLoggedIn = false;
  const user = {
    name: 'Marie Dupont',
    email: 'marie.dupont@email.com',
    avatar: '/api/placeholder/40/40'
  };

  const getLocalizedText = (text: Record<string, string>) => {
    return text[locale] || text['fr'] || text['en'];
  }

  const texts = {
    nav: {
      events: { fr: 'Événements', en: 'Events' },
      organizers: { fr: 'Organisateurs', en: 'Organizers' },
      about: { fr: 'À propos', en: 'About' },
      login: { fr: 'Connexion', en: 'Login' },
      signup: { fr: 'Inscription', en: 'Sign up' },
      profile: { fr: 'Mon profil', en: 'My profile' },
      settings: { fr: 'Paramètres', en: 'Settings' },
      logout: { fr: 'Déconnexion', en: 'Logout' }
    },
    hero: {
      title: {
        fr: 'Découvrez les Événements qui Vous Passionnent',
        en: 'Discover Events That Excite You'
      },
      subtitle: {
        fr: 'Réservez vos billets pour les meilleurs événements culturels, sportifs et professionnels près de chez vous',
        en: 'Book your tickets for the best cultural, sports and professional events near you'
      },
      cta: {
        fr: 'Explorer les événements',
        en: 'Explore events'
      },
      searchPlaceholder: {
        fr: 'Rechercher un événement, un lieu, un artiste...',
        en: 'Search for an event, venue, artist...'
      }
    },
    stats: {
      events: { fr: 'Événements', en: 'Events' },
      users: { fr: 'Utilisateurs', en: 'Users' },
      tickets: { fr: 'Billets vendus', en: 'Tickets sold' },
      satisfaction: { fr: 'Satisfaction', en: 'Satisfaction' }
    },
    categories: {
      title: { fr: 'Catégories Populaires', en: 'Popular Categories' },
      viewAll: { fr: 'Voir tout', en: 'View all' }
    },
    featured: {
      title: { fr: 'Événements à la Une', en: 'Featured Events' },
      viewAll: { fr: 'Voir tous les événements', en: 'View all events' }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50">
      {/* Navigation Toolbar */}
      <header className="border-b border-red-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-400 to-rose-500 rounded-lg">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">M&C Society</h1>
                <p className="text-xs text-red-600 font-medium">Événements Premium</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link href={`/${locale}/events`} className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                {getLocalizedText(texts.nav.events)}
              </Link>
              <Link href={`/${locale}/organizers`} className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                {getLocalizedText(texts.nav.organizers)}
              </Link>
              <Link href={`/${locale}/about`} className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                {getLocalizedText(texts.nav.about)}
              </Link>
            </nav>

            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-gray-50 rounded-full px-4 py-2 max-w-md mx-4 flex-1">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder={getLocalizedText(texts.hero.searchPlaceholder)}
                className="bg-transparent border-none outline-none flex-1 text-sm"
              />
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {/* Language Selector */}
              <div className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-200">
                🌍 {locale.toUpperCase()}
              </div>
              
              {isLoggedIn ? (
                <>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <div className="w-full h-full bg-gradient-to-r from-red-400 to-rose-500 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </Avatar>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <User className="h-4 w-4 mr-2" />
                        {getLocalizedText(texts.nav.profile)}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        {getLocalizedText(texts.nav.settings)}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <LogOut className="h-4 w-4 mr-2" />
                        {getLocalizedText(texts.nav.logout)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50">
                    {getLocalizedText(texts.nav.login)}
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700">
                    {getLocalizedText(texts.nav.signup)}
                  </Button>
                </>
              )}

              {/* Mobile Menu Button */}
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_50%)]" />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-full text-red-700 text-sm font-medium mb-8">
              <Star className="h-4 w-4 mr-2 text-red-500" />
              Plus de {stats.events.toLocaleString()} événements disponibles
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight bg-gradient-to-r from-gray-900 via-red-800 to-gray-900 bg-clip-text text-transparent">
              {getLocalizedText(texts.hero.title)}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              {getLocalizedText(texts.hero.subtitle)}
            </p>
            
            {/* Search Bar Mobile */}
            <div className="md:hidden mb-8">
              <div className="flex items-center bg-white rounded-full px-4 py-3 shadow-lg border border-red-100">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder={getLocalizedText(texts.hero.searchPlaceholder)}
                  className="border-none outline-none flex-1"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg">
                {getLocalizedText(texts.hero.cta)}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-red-200 text-red-700 hover:bg-red-50">
                Créer un événement
              </Button>
            </div>

            {/* Stats Grid - Données réelles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-red-100">
                <div className="flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-red-500 mr-2" />
                  <span className="text-3xl font-bold text-gray-900">{stats.events.toLocaleString()}+</span>
                </div>
                <p className="text-gray-600 font-medium">{getLocalizedText(texts.stats.events)}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-red-100">
                <div className="flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-rose-500 mr-2" />
                  <span className="text-3xl font-bold text-gray-900">{stats.users.toLocaleString()}+</span>
                </div>
                <p className="text-gray-600 font-medium">{getLocalizedText(texts.stats.users)}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-red-100">
                <div className="flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-red-600 mr-2" />
                  <span className="text-3xl font-bold text-gray-900">{stats.tickets.toLocaleString()}+</span>
                </div>
                <p className="text-gray-600 font-medium">{getLocalizedText(texts.stats.tickets)}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-red-100">
                <div className="flex items-center justify-center mb-3">
                  <Star className="h-6 w-6 text-rose-600 mr-2" />
                  <span className="text-3xl font-bold text-gray-900">{stats.satisfaction}/5</span>
                </div>
                <p className="text-gray-600 font-medium">{getLocalizedText(texts.stats.satisfaction)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section - Données réelles de la DB */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {getLocalizedText(texts.categories.title)}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Explorez nos catégories d&#39;événements les plus populaires
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((category) => (
                <Link 
                  key={category.name}
                  href={`/${locale}/events?category=${encodeURIComponent(category.name)}`}
                >
                  <Card className="p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group border-red-100 hover:border-red-200">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {category.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {category.count} événement{category.count > 1 ? 's' : ''}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune catégorie disponible</h3>
              <p className="text-gray-600">Les catégories seront bientôt disponibles.</p>
            </div>
          )}

          {categories.length > 6 && (
            <div className="text-center mt-8">
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                {getLocalizedText(texts.categories.viewAll)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Events - Données réelles */}
      <section className="py-16 px-4 bg-gradient-to-br from-red-50/50 to-rose-50/50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {getLocalizedText(texts.featured.title)}
              </h2>
              <p className="text-gray-600 text-lg">
                Découvrez notre sélection d&#39;événements exceptionnels
              </p>
            </div>
            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              {getLocalizedText(texts.featured.viewAll)}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredEvents.map((event) => (
                <Link key={event.id} href={`/${locale}/events/${event.id}`}>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group border-red-100 cursor-pointer">
                    <div className="relative">
                      <div className="h-48 bg-gradient-to-br from-red-400 via-rose-500 to-red-600 flex items-center justify-center">
                        <Ticket className="h-16 w-16 text-white/30" />
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/95 text-gray-900 text-sm font-medium rounded-full shadow-sm">
                          {event.category}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center space-x-1 bg-white/95 px-2 py-1 rounded-full shadow-sm">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium text-gray-900">{event.rating}</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-700 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-3 text-red-500" />
                          <span className="text-sm">
                            {new Date(event.date).toLocaleDateString(locale, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-3 text-red-500" />
                          <span className="text-sm">{event.location}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="h-4 w-4 mr-3 text-red-500" />
                          <span className="text-sm">{event.attendees.toLocaleString()} participant{event.attendees > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <div className="w-full h-full bg-gradient-to-r from-red-400 to-rose-500 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {event.organizer.name.charAt(0)}
                              </span>
                            </div>
                          </Avatar>
                          <span className="text-sm text-gray-600 font-medium">{event.organizer.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">À partir de</p>
                          <p className="text-2xl font-bold text-red-600">{event.price}€</p>
                        </div>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg">
                        Réserver maintenant
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun événement disponible</h3>
              <p className="text-gray-600">Les événements seront bientôt disponibles. Revenez plus tard !</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Organisez votre événement de rêve
            </h2>
            <p className="text-xl text-red-100 mb-8 leading-relaxed">
              Rejoignez plus de {stats.users.toLocaleString()} organisateurs qui font confiance à M&C Society
              pour créer des expériences inoubliables.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4 bg-white text-red-600 hover:bg-gray-50 shadow-lg">
                Créer mon événement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white text-white hover:bg-white/10">
                En savoir plus
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-red-500 to-rose-600 rounded-lg">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">M&C Society</span>
                  <p className="text-red-400 text-sm">Événements Premium</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                La plateforme de référence pour découvrir et réserver vos événements préférés en France.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-bold mb-4">Navigation</h3>
              <ul className="space-y-2">
                <li><Link href={`/${locale}/events`} className="hover:text-red-400 transition-colors">Événements</Link></li>
                <li><Link href={`/${locale}/organizers`} className="hover:text-red-400 transition-colors">Organisateurs</Link></li>
                <li><Link href={`/${locale}/about`} className="hover:text-red-400 transition-colors">À propos</Link></li>
                <li><Link href={`/${locale}/contact`} className="hover:text-red-400 transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-white font-bold mb-4">Catégories</h3>
              <ul className="space-y-2">
                {categories.slice(0, 4).map((category) => (
                  <li key={category.name}>
                    <Link href={`/${locale}/events?category=${encodeURIComponent(category.name)}`} className="hover:text-red-400 transition-colors">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold mb-4">Contact</h3>
              <div className="space-y-2">
                <p className="text-gray-400">📧 contact@mcsociety.fr</p>
                <p className="text-gray-400">📞 +33 1 23 45 67 89</p>
                <p className="text-gray-400">📍 Paris, France</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 M&C Society. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}