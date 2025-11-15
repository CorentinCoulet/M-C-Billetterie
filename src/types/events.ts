export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  price: number;
  category: { name: string };
  rating?: number;
  featured?: boolean;
}

export interface Stats {
  totalEvents: number;
  totalUsers: number;
  totalTickets: number;
}
