import { Event, Stats } from '@/types/events';

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Festival Rouge Passion 2025',
    description: 'Un festival électronique époustouflant avec les plus grands artistes internationaux dans une ambiance rouge enflammée.',
    date: new Date('2025-08-15'),
    location: 'Parc Floral, Paris',
    price: 95,
    category: { name: 'Festival' },
    featured: true,
    rating: 4.9
  },
  {
    id: '2',
    title: 'Soirée Jazz Écarlate',
    description: 'Une soirée intimiste dans un cadre rouge velours avec les maîtres du jazz contemporain.',
    date: new Date('2025-07-20'),
    location: 'Opéra Bastille, Paris',
    price: 55,
    category: { name: 'Concert' },
    rating: 4.8
  },
  {
    id: '3',
    title: 'Théâtre Carmin',
    description: 'Une pièce dramatique moderne dans un écrin rouge et or, une expérience théâtrale inoubliable.',
    date: new Date('2025-06-25'),
    location: 'Théâtre du Châtelet, Paris',
    price: 45,
    category: { name: 'Théâtre' },
    rating: 4.7
  },
  {
    id: '4',
    title: 'Tech Summit Crimson',
    description: 'La conférence tech la plus prestigieuse dans un univers rouge innovation et futurisme.',
    date: new Date('2025-09-10'),
    location: 'Palais des Congrès, Paris',
    price: 135,
    category: { name: 'Conférence' },
    featured: true,
    rating: 4.6
  }
];

export const mockStats: Stats = {
  totalEvents: 1547,
  totalUsers: 18932,
  totalTickets: 125678
};
