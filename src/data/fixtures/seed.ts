export interface CategoryFixture {
  name: string;
}

export interface AccountFixture {
  email: string;
  name: string;
  role: 'ADMIN' | 'ORGANIZER' | 'USER';
  isVerified?: boolean;
}

export interface EventFixture {
  title: string;
  description: string;
  date: string;
  location: string;
  maxCapacity: number;
  category: string;
  isPublished?: boolean;
}

export interface OrganizerFixture extends AccountFixture {
  events: EventFixture[];
}

export interface TicketFixture {
  eventTitle: string;
  code: string;
  status: 'paid' | 'pending';
}

export interface OrderFixture {
  userEmail: string;
  status: 'paid' | 'pending_payment';
  totalPrice: number;
  tickets: TicketFixture[];
}

export const CATEGORY_FIXTURES: CategoryFixture[] = [
  { name: 'MUSIC' },
  { name: 'SPORTS' },
  { name: 'CONFERENCE' },
  { name: 'FOOD' },
  { name: 'THEATER' },
  { name: 'EXHIBITION' },
];

export const ADMIN_FIXTURE: AccountFixture = {
  email: 'admin@demo.com',
  name: 'Admin Demo',
  role: 'ADMIN',
  isVerified: true,
};

export const ORGANIZER_FIXTURES: OrganizerFixture[] = [
  {
    email: 'music.events@demo.com',
    name: 'Music Events Pro',
    role: 'ORGANIZER',
    isVerified: true,
    events: [
      {
        title: 'Concert Rock - Les Legendes',
        description: 'Une soiree inoubliable avec les plus grands hits du rock',
        date: '2025-11-15T20:00:00Z',
        location: 'Zenith de Paris',
        maxCapacity: 5000,
        category: 'MUSIC',
        isPublished: true,
      },
      {
        title: 'Festival Jazz sous les etoiles',
        description: 'Trois jours de jazz avec les plus grands artistes internationaux',
        date: '2025-11-20T18:00:00Z',
        location: 'Parc de la Villette',
        maxCapacity: 3000,
        category: 'MUSIC',
        isPublished: true,
      },
      {
        title: 'Soiree Electro Night',
        description: 'La meilleure soiree electro de Paris avec DJ internationaux',
        date: '2025-11-25T22:00:00Z',
        location: 'Accor Arena',
        maxCapacity: 8000,
        category: 'MUSIC',
        isPublished: true,
      },
    ],
  },
  {
    email: 'sports.manager@demo.com',
    name: 'Sports Manager',
    role: 'ORGANIZER',
    isVerified: true,
    events: [
      {
        title: 'Match de Football - PSG vs OM',
        description: 'Le classique du championnat de France',
        date: '2025-11-18T21:00:00Z',
        location: 'Parc des Princes',
        maxCapacity: 47929,
        category: 'SPORTS',
        isPublished: true,
      },
      {
        title: 'Tournoi de Tennis - Masters Paris',
        description: 'Les meilleurs joueurs mondiaux a Paris Bercy',
        date: '2025-11-22T14:00:00Z',
        location: 'AccorHotels Arena',
        maxCapacity: 15000,
        category: 'SPORTS',
        isPublished: true,
      },
      {
        title: 'Marathon de Paris',
        description: 'Course mythique dans les rues de Paris',
        date: '2025-12-05T08:00:00Z',
        location: 'Champs-Elysees',
        maxCapacity: 50000,
        category: 'SPORTS',
        isPublished: true,
      },
    ],
  },
  {
    email: 'tech.conferences@demo.com',
    name: 'Tech Conferences Inc',
    role: 'ORGANIZER',
    isVerified: true,
    events: [
      {
        title: 'Conference Tech Innovation 2025',
        description: 'Les dernieres tendances en IA, Cloud et Cybersecurite',
        date: '2025-11-28T09:00:00Z',
        location: 'Centre de congres Porte Maillot',
        maxCapacity: 800,
        category: 'CONFERENCE',
        isPublished: true,
      },
      {
        title: 'DevOps Summit Paris',
        description: 'Deux jours dedies aux pratiques DevOps et Cloud Native',
        date: '2025-12-10T09:00:00Z',
        location: 'Paris Convention Centre',
        maxCapacity: 1200,
        category: 'CONFERENCE',
        isPublished: true,
      },
    ],
  },
  {
    email: 'culture.events@demo.com',
    name: 'Culture Events',
    role: 'ORGANIZER',
    isVerified: true,
    events: [
      {
        title: 'Festival Gastronomique',
        description: 'Decouvrez les saveurs du monde avec nos chefs etoiles',
        date: '2025-11-30T12:00:00Z',
        location: 'Esplanade des Invalides',
        maxCapacity: 2000,
        category: 'FOOD',
        isPublished: true,
      },
      {
        title: 'Theatre - Le Malade Imaginaire',
        description: 'La celebre piece de Moliere revisitee',
        date: '2025-12-08T20:00:00Z',
        location: 'Comedie Francaise',
        maxCapacity: 860,
        category: 'THEATER',
        isPublished: true,
      },
      {
        title: 'Exposition Art Moderne',
        description: 'Collection exceptionnelle dart contemporain',
        date: '2025-12-01T10:00:00Z',
        location: 'Grand Palais',
        maxCapacity: 500,
        category: 'EXHIBITION',
        isPublished: true,
      },
    ],
  },
];

export const USER_FIXTURES: AccountFixture[] = [
  { email: 'alice.martin@demo.com', name: 'Alice Martin', role: 'USER', isVerified: true },
  { email: 'bob.dubois@demo.com', name: 'Bob Dubois', role: 'USER', isVerified: true },
  { email: 'claire.bernard@demo.com', name: 'Claire Bernard', role: 'USER', isVerified: true },
  { email: 'david.petit@demo.com', name: 'David Petit', role: 'USER', isVerified: true },
  { email: 'emma.durand@demo.com', name: 'Emma Durand', role: 'USER', isVerified: true },
];

export const ORDER_FIXTURES: OrderFixture[] = [
  {
    userEmail: 'alice.martin@demo.com',
    status: 'paid',
    totalPrice: 90,
    tickets: [
      { eventTitle: 'Concert Rock - Les Legendes', code: 'TICKET-ALICE-001', status: 'paid' },
      { eventTitle: 'Concert Rock - Les Legendes', code: 'TICKET-ALICE-002', status: 'paid' },
      { eventTitle: 'Festival Gastronomique', code: 'TICKET-ALICE-003', status: 'paid' },
    ],
  },
  {
    userEmail: 'alice.martin@demo.com',
    status: 'paid',
    totalPrice: 40,
    tickets: [
      { eventTitle: 'Festival Gastronomique', code: 'TICKET-ALICE-004', status: 'paid' },
    ],
  },
  {
    userEmail: 'bob.dubois@demo.com',
    status: 'paid',
    totalPrice: 135,
    tickets: [
      { eventTitle: 'Match de Football - PSG vs OM', code: 'TICKET-BOB-001', status: 'paid' },
      { eventTitle: 'Match de Football - PSG vs OM', code: 'TICKET-BOB-002', status: 'paid' },
      { eventTitle: 'Match de Football - PSG vs OM', code: 'TICKET-BOB-003', status: 'paid' },
    ],
  },
  {
    userEmail: 'claire.bernard@demo.com',
    status: 'paid',
    totalPrice: 120,
    tickets: [
      { eventTitle: 'Conference Tech Innovation 2025', code: 'TICKET-CLAIRE-001', status: 'paid' },
    ],
  },
  {
    userEmail: 'claire.bernard@demo.com',
    status: 'pending_payment',
    totalPrice: 70,
    tickets: [
      { eventTitle: 'Theatre - Le Malade Imaginaire', code: 'TICKET-CLAIRE-002', status: 'pending' },
      { eventTitle: 'Theatre - Le Malade Imaginaire', code: 'TICKET-CLAIRE-003', status: 'pending' },
    ],
  },
  {
    userEmail: 'david.petit@demo.com',
    status: 'paid',
    totalPrice: 85,
    tickets: [
      { eventTitle: 'Festival Jazz sous les etoiles', code: 'TICKET-DAVID-001', status: 'paid' },
    ],
  },
  {
    userEmail: 'emma.durand@demo.com',
    status: 'paid',
    totalPrice: 150,
    tickets: [
      { eventTitle: 'Tournoi de Tennis - Masters Paris', code: 'TICKET-EMMA-001', status: 'paid' },
      { eventTitle: 'Tournoi de Tennis - Masters Paris', code: 'TICKET-EMMA-002', status: 'paid' },
    ],
  },
  {
    userEmail: 'emma.durand@demo.com',
    status: 'paid',
    totalPrice: 35,
    tickets: [
      { eventTitle: 'Soiree Electro Night', code: 'TICKET-EMMA-003', status: 'paid' },
    ],
  },
];

export const SEED_SUMMARY = {
  admins: 1,
  organizers: ORGANIZER_FIXTURES.length,
  users: USER_FIXTURES.length,
  events: ORGANIZER_FIXTURES.reduce((total, organizer) => total + organizer.events.length, 0),
  orders: ORDER_FIXTURES.length,
};
