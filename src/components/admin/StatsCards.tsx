import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, TrendingUp, Users } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    users: {
      total: number;
      new: number;
    };
    events: {
      total: number;
      upcoming: number;
      published: number;
    };
    orders: {
      total: number;
      completed: number;
      pending: number;
      cancelled: number;
    };
    revenue: {
      total: number;
      thisMonth: number;
      lastMonth: number;
    };
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const revenueGrowth = stats.revenue.lastMonth > 0 
    ? ((stats.revenue.thisMonth - stats.revenue.lastMonth) / stats.revenue.lastMonth * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Utilisateurs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.users.total}</div>
          <p className="text-xs text-muted-foreground">
            +{stats.users.new} ce mois
          </p>
        </CardContent>
      </Card>

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

      {/* Commandes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Commandes</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.orders.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.orders.completed} complétées
          </p>
        </CardContent>
      </Card>

      {/* Revenus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenus</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR'
            }).format(stats.revenue.total)}
          </div>
          <p className="text-xs text-muted-foreground">
            {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% ce mois
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
