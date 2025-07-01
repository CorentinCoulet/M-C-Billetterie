import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrismaClient } from '@/generated/prisma';
import { Calendar, Edit, Eye, MapPin, Trash2, Users } from 'lucide-react';
import { Suspense } from 'react';

const prisma = new PrismaClient();

async function getEventsData() {
  try {
    const events = await prisma.event.findMany({
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
          },
        },
        _count: {
          select: {
            tickets: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

function EventsTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    date: Date;
    location: string;
    maxCapacity: number | null;
    isPublished: boolean;
    isCancelled: boolean;
    organizer: { name: string };
    category: { name: string } | null;
    venue: { name: string } | null;
    _count: {
      tickets: number;
      reviews: number;
    };
    createdAt: Date;
  };
}

function EventCard({ event }: EventCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getStatusBadge = () => {
    if (event.isCancelled) {
      return <Badge variant="destructive">Annulé</Badge>;
    }
    if (!event.isPublished) {
      return <Badge variant="secondary">Brouillon</Badge>;
    }
    const eventDate = new Date(event.date);
    const now = new Date();
    if (eventDate < now) {
      return <Badge variant="outline">Terminé</Badge>;
    }
    return <Badge variant="default">Publié</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Par {event.organizer.name}
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            {formatDate(event.date)}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            {event.venue?.name || event.location}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            {event._count.tickets} billets vendus
            {event.maxCapacity && ` / ${event.maxCapacity} places`}
          </div>
          
          {event.category && (
            <Badge variant="outline" className="text-xs">
              {event.category.name}
            </Badge>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4" />
              Voir
            </Button>
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
            <Button size="sm" variant="outline">
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function EventsContent() {
  const events = await getEventsData();
  
  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Aucun événement trouvé</p>
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))
      )}
    </div>
  );
}

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des événements</h1>
          <p className="text-gray-600">Gérez tous les événements de la plateforme</p>
        </div>
        <Button>
          Nouvel événement
        </Button>
      </div>
      
      <Suspense fallback={<EventsTableSkeleton />}>
        <EventsContent />
      </Suspense>
    </div>
  );
}
