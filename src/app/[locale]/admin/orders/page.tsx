import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrismaClient } from '@/generated/prisma';
import { Calendar, CreditCard, Eye, RefreshCw, User } from 'lucide-react';
import { Suspense } from 'react';

const prisma = new PrismaClient();

async function getOrdersData() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        payment: {
          select: {
            paymentMethod: true,
            paymentStatus: true,
            paymentDate: true,
          },
        },
        tickets: {
          include: {
            event: {
              select: {
                title: true,
                date: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to latest 50 orders
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

function OrdersTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface OrderCardProps {
  order: {
    id: string;
    totalPrice: number;
    status: string;
    promoCode: string | null;
    discountAmount: number | null;
    currency: string;
    createdAt: Date;
    user: {
      name: string | null;
      email: string;
    };
    payment: {
      paymentMethod: string;
      paymentStatus: string;
      paymentDate: Date;
    } | null;
    tickets: Array<{
      id: string;
      event: {
        title: string;
        date: Date;
      };
    }>;
    _count: {
      tickets: number;
    };
  };
}

function OrderCard({ order }: OrderCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Payé</Badge>;
      case 'pending_payment':
        return <Badge variant="secondary">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'draft':
        return <Badge variant="outline">Brouillon</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'completed':
        return <Badge variant="default" className="text-xs">Réussi</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">En cours</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Échoué</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-mono">
              #{order.id.slice(0, 8)}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {order.user.name || 'Utilisateur anonyme'} ({order.user.email})
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {formatDate(order.createdAt)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              {order._count.tickets} billet(s)
            </div>
          </div>

          {order.payment && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CreditCard className="h-4 w-4" />
                {order.payment.paymentMethod}
              </div>
              {getPaymentStatusBadge(order.payment.paymentStatus)}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <div>
              <span className="text-lg font-semibold">
                {formatPrice(order.totalPrice, order.currency)}
              </span>
              {order.discountAmount && (
                <span className="text-sm text-green-600 ml-2">
                  (-{formatPrice(order.discountAmount, order.currency)})
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4" />
                Détails
              </Button>
              {order.status === 'pending_payment' && (
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Relancer
                </Button>
              )}
            </div>
          </div>

          {order.tickets.length > 0 && (
            <div className="text-xs text-gray-500">
              Événements: {order.tickets.map(t => t.event.title).join(', ')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function OrdersContent() {
  const orders = await getOrdersData();
  
  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Aucune commande trouvée</p>
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des commandes</h1>
        <p className="text-gray-600">Consultez et gérez toutes les commandes</p>
      </div>
      
      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}
