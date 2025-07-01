import { EventBooking } from '@/components/events/EventBooking';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrismaClient } from '@/generated/prisma';
import { ArrowLeft, Calendar, Clock, MapPin, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

const prisma = new PrismaClient();

interface EventDetailProps {
  params: {
    id: string;
    locale: string;
  };
}

async function getEventDetails(id: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        venue: {
          select: {
            name: true,
            address: true,
            capacity: true,
          },
        },
        theme: {
          select: {
            name: true,
            color: true,
            imagePath: true,
          },
        },
        reviews: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: {
              where: {
                status: 'paid',
              },
            },
            reviews: true,
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    // Calculer le prix (simulation basée sur l'ID en attendant un système de prix)
    const basePrice = parseInt(event.id.slice(-2), 16) || 50;
    const price = Math.max(25, Math.min(150, basePrice));

    // Calculer la note moyenne
    const avgRating = event.reviews.length > 0
      ? event.reviews.reduce((sum, review) => sum + review.rating, 0) / event.reviews.length
      : 0;

    return {
      ...event,
      price,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
}

function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function EventContent({ eventId }: { eventId: string }) {
  const event = await getEventDetails(eventId);

  if (!event) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isEventPassed = new Date(event.date) < new Date();
  const availableSpots = event.maxCapacity ? event.maxCapacity - event._count.tickets : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux événements
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image de l'événement */}
            <div className="relative h-64 lg:h-80 rounded-lg overflow-hidden">
              <div 
                className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center"
                style={{
                  backgroundColor: event.theme?.color || '#3B82F6',
                }}
              >
                <div className="text-center text-white">
                  <Calendar className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg opacity-75">Image de l&apos;événement</p>
                </div>
              </div>
              {event.isCancelled && (
                <div className="absolute inset-0 bg-red-600 bg-opacity-75 flex items-center justify-center">
                  <Badge variant="destructive" className="text-lg py-2 px-4">
                    ÉVÉNEMENT ANNULÉ
                  </Badge>
                </div>
              )}
            </div>

            {/* Informations de l'événement */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                  <p className="text-gray-600">Par {event.organizer.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {event.category && (
                    <Badge variant="outline">{event.category.name}</Badge>
                  )}
                  {!event.isPublished && (
                    <Badge variant="secondary">Brouillon</Badge>
                  )}
                </div>
              </div>

              {/* Date et lieu */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{formatDate(event.date)}</p>
                    <p className="text-sm text-gray-500">à {formatTime(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{event.venue?.name || event.location}</p>
                    {event.venue?.address && (
                      <p className="text-sm text-gray-500">{event.venue.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm">
                    {event._count.tickets} participant{event._count.tickets > 1 ? 's' : ''}
                  </span>
                </div>
                {event.avgRating > 0 && (
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="text-sm">
                      {event.avgRating} ({event._count.reviews} avis)
                    </span>
                  </div>
                )}
                {availableSpots !== null && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm">
                      {availableSpots > 0 ? `${availableSpots} places restantes` : 'Complet'}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="prose max-w-none">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-gray-700">
                  {event.description || 'Aucune description disponible pour cet événement.'}
                </p>
              </div>
            </div>

            {/* Avis */}
            {event.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Avis des participants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {review.user.name || 'Utilisateur anonyme'}
                          </span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Intl.DateTimeFormat('fr-FR').format(new Date(review.createdAt))}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Achat */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Réserver vos billets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EventBooking
                  event={{
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    location: event.location,
                    price: event.price,
                    organizer: event.organizer,
                  }}
                  availableSpots={availableSpots}
                  isEventPassed={isEventPassed}
                  isCancelled={event.isCancelled}
                  isPublished={event.isPublished}
                />
              </CardContent>
            </Card>

            {/* Informations supplémentaires */}
            <Card>
              <CardHeader>
                <CardTitle>Informations pratiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Organisateur:</span>
                    <span className="font-medium">{event.organizer.name}</span>
                  </div>
                  {event.maxCapacity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacité:</span>
                      <span className="font-medium">{event.maxCapacity} places</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transfert:</span>
                    <span className="font-medium">
                      {event.allowTransfer ? 'Autorisé' : 'Non autorisé'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Achat anonyme:</span>
                    <span className="font-medium">
                      {event.allowAnonymousPurchase ? 'Autorisé' : 'Compte requis'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage({ params }: EventDetailProps) {
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventContent eventId={params.id} />
    </Suspense>
  );
}
