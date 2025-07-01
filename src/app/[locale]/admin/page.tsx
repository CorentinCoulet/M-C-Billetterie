import { StatsCards } from '@/components/admin/StatsCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrismaClient } from '@/generated/prisma';
import Link from 'next/link';
import { Suspense } from 'react';

const prisma = new PrismaClient();

async function getAdminStats() {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get user stats
    const [totalUsers, newUsersThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: thisMonth
          }
        }
      })
    ]);

    // Get event stats
    const [totalEvents, upcomingEvents, publishedEvents] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: {
          date: {
            gte: now
          },
          isPublished: true,
          isCancelled: false
        }
      }),
      prisma.event.count({
        where: {
          isPublished: true
        }
      })
    ]);

    // Get order stats
    const [totalOrders, completedOrders, pendingOrders, cancelledOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: 'paid'
        }
      }),
      prisma.order.count({
        where: {
          status: 'pending_payment'
        }
      }),
      prisma.order.count({
        where: {
          status: 'cancelled'
        }
      })
    ]);

    // Get revenue stats
    const [totalRevenue, thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      prisma.order.aggregate({
        where: {
          status: 'paid'
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: {
            gte: thisMonth,
            lt: nextMonth
          }
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: {
            gte: lastMonth,
            lt: thisMonth
          }
        },
        _sum: {
          totalPrice: true
        }
      })
    ]);

    return {
      users: {
        total: totalUsers,
        new: newUsersThisMonth
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        published: publishedEvents
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        cancelled: cancelledOrders
      },
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
        thisMonth: thisMonthRevenue._sum.totalPrice || 0,
        lastMonth: lastMonthRevenue._sum.totalPrice || 0
      }
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Return default stats on error
    return {
      users: { total: 0, new: 0 },
      events: { total: 0, upcoming: 0, published: 0 },
      orders: { total: 0, completed: 0, pending: 0, cancelled: 0 },
      revenue: { total: 0, thisMonth: 0, lastMonth: 0 }
    };
  }
}

async function DashboardStats() {
  const stats = await getAdminStats();
  return <StatsCards stats={stats} />;
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

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600">
          Vue d&apos;ensemble de votre plateforme de billetterie
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Nouvel utilisateur inscrit</span>
              <span className="text-gray-500">Il y a 2h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Événement publié</span>
              <span className="text-gray-500">Il y a 5h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Commande complétée</span>
              <span className="text-gray-500">Il y a 1j</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/admin/users">
                Gérer les utilisateurs
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/events">
                Gérer les événements
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/orders">
                Voir les commandes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
