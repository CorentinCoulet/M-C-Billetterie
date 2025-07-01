import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrismaClient } from '@/generated/prisma';
import { Calendar, CreditCard, Plus, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const prisma = new PrismaClient();

// Mock organizer ID - in a real app, this would come from auth
const ORGANIZER_ID = 'mock-organizer-id';

async function getOrganizerStats(organizerId: string) {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get organizer's events
    const [totalEvents, upcomingEvents, publishedEvents] = await Promise.all([
      prisma.event.count({
        where: { organizerId }
      }),
      prisma.event.count({
        where: {
          organizerId,
          date: { gte: now },
          isPublished: true,
          isCancelled: false
        }
      }),
      prisma.event.count({
        where: {
          organizerId,
          isPublished: true
        }
      })
    ]);

    // Get ticket sales for organizer's events
    const organizerEvents = await prisma.event.findMany({
      where: { organizerId },
      select: { id: true }
    });

    const eventIds = organizerEvents.map(e => e.id);

    const [totalTicketsSold, thisMonthRevenue] = await Promise.all([
      prisma.ticket.count({
        where: {
          eventId: { in: eventIds },
          status: 'paid'
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: { gte: thisMonth, lt: nextMonth },
          tickets: {
            some: {
              eventId: { in: eventIds }
            }
          }
        },
        _sum: {
          totalPrice: true
        }
      })
    ]);

    // Get total revenue
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: 'paid',
        tickets: {
          some: {
            eventId: { in: eventIds }
          }
        }
      },
      _sum: {
        totalPrice: true
      }
    });

    return {
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        published: publishedEvents
      },
      tickets: {
        sold: totalTicketsSold
      },
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
        thisMonth: thisMonthRevenue._sum.totalPrice || 0
      }
    };
  } catch (error) {
    console.error('Error fetching organizer stats:', error);
    return {
      events: { total: 0, upcoming: 0, published: 0 },
      tickets: { sold: 0 },
      revenue: { total: 0, thisMonth: 0 }
    };
  }
}

async function getRecentEvents(organizerId: string) {
  try {
    return await prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return [];
  }
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

interface OrganizerStatsProps {
  organizerId: string;
}

async function OrganizerStats({ organizerId }: OrganizerStatsProps) {
  const stats = await getOrganizerStats(organizerId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Événements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Événements</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.events.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.events.upcoming} à venir
          </p>
        </CardContent>
      </Card>

      {/* Billets vendus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Billets vendus</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.tickets.sold}</div>
          <p className="text-xs text-muted-foreground">
            Total vendu
          </p>
        </CardContent>
      </Card>

      {/* Revenus totaux */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPrice(stats.revenue.total)}
          </div>
          <p className="text-xs text-muted-foreground">
            Tous les événements
          </p>
        </CardContent>
      </Card>

      {/* Ce mois */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ce mois</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPrice(stats.revenue.thisMonth)}
          </div>
          <p className="text-xs text-muted-foreground">
            Revenus du mois
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function RecentEvents({ organizerId }: { organizerId: string }) {
  const events = await getRecentEvents(organizerId);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getStatusBadge = (event: { isCancelled: boolean; isPublished: boolean; date: Date }) => {
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
        <CardTitle>Événements récents</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Aucun événement créé
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-gray-500">
                    {formatDate(event.date)} • {event._count.tickets} billets
                  </div>
                </div>
                {getStatusBadge(event)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrganizerDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">
            Gérez vos événements et suivez vos performances
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel événement
          </Link>
        </Button>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <OrganizerStats organizerId={ORGANIZER_ID} />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded-lg" />}>
          <RecentEvents organizerId={ORGANIZER_ID} />
        </Suspense>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/organizer/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Créer un événement
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/organizer/events">
                <Calendar className="mr-2 h-4 w-4" />
                Gérer mes événements
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/organizer/sales">
                <CreditCard className="mr-2 h-4 w-4" />
                Voir les ventes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
