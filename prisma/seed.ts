// prisma/seed.ts
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Debut du seeding...')

  // Nettoyer les donnees existantes
  await prisma.ticket.deleteMany()
  await prisma.order.deleteMany()
  await prisma.event.deleteMany()
  await prisma.organizer.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // ====================================================================================
  // CATEGORIES
  // ====================================================================================
  
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'MUSIC' } }),
    prisma.category.create({ data: { name: 'SPORTS' } }),
    prisma.category.create({ data: { name: 'CONFERENCE' } }),
    prisma.category.create({ data: { name: 'FOOD' } }),
    prisma.category.create({ data: { name: 'THEATER' } }),
    prisma.category.create({ data: { name: 'EXHIBITION' } }),
  ])

  console.log('Categories creees')

  // ====================================================================================
  // ADMINISTRATEUR
  // ====================================================================================
  
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: adminPassword,
      name: 'Admin Demo',
      role: 'ADMIN',
      isVerified: true,
    },
  })

  console.log('Administrateur cree')

  // ====================================================================================
  // ORGANISATEURS
  // ====================================================================================
  
  const organizerPassword = await bcrypt.hash('organizer123', 10)
  
  const organizerUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'music.events@demo.com',
        password: organizerPassword,
        name: 'Music Events Pro',
        role: 'ORGANIZER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sports.manager@demo.com',
        password: organizerPassword,
        name: 'Sports Manager',
        role: 'ORGANIZER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'tech.conferences@demo.com',
        password: organizerPassword,
        name: 'Tech Conferences Inc',
        role: 'ORGANIZER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'culture.events@demo.com',
        password: organizerPassword,
        name: 'Culture Events',
        role: 'ORGANIZER',
        isVerified: true,
      },
    }),
  ])

  // Creer les organisateurs (entites distinctes)
  const organizers = await Promise.all([
    prisma.organizer.create({
      data: { name: 'Music Events Pro' },
    }),
    prisma.organizer.create({
      data: { name: 'Sports Manager' },
    }),
    prisma.organizer.create({
      data: { name: 'Tech Conferences Inc' },
    }),
    prisma.organizer.create({
      data: { name: 'Culture Events' },
    }),
  ])

  console.log('4 organisateurs crees')

  // ====================================================================================
  // UTILISATEURS
  // ====================================================================================
  
  const userPassword = await bcrypt.hash('user123', 10)
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice.martin@demo.com',
        password: userPassword,
        name: 'Alice Martin',
        role: 'USER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob.dubois@demo.com',
        password: userPassword,
        name: 'Bob Dubois',
        role: 'USER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'claire.bernard@demo.com',
        password: userPassword,
        name: 'Claire Bernard',
        role: 'USER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.petit@demo.com',
        password: userPassword,
        name: 'David Petit',
        role: 'USER',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'emma.durand@demo.com',
        password: userPassword,
        name: 'Emma Durand',
        role: 'USER',
        isVerified: true,
      },
    }),
  ])

  console.log('5 utilisateurs crees')

  // ====================================================================================
  // EVENEMENTS - Music Events Pro
  // ====================================================================================
  
  const musicEvents = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Concert Rock - Les Legendes',
        description: 'Une soiree inoubliable avec les plus grands hits du rock',
        date: new Date('2025-11-15T20:00:00Z'),
        location: 'Zenith de Paris',
        maxCapacity: 5000,
        isPublished: true,
        categoryId: categories[0].id,
        organizerId: organizers[0].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Festival Jazz sous les etoiles',
        description: 'Trois jours de jazz avec les plus grands artistes internationaux',
        date: new Date('2025-11-20T18:00:00Z'),
        location: 'Parc de la Villette',
        maxCapacity: 3000,
        isPublished: true,
        categoryId: categories[0].id,
        organizerId: organizers[0].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Soiree Electro Night',
        description: 'La meilleure soiree electro de Paris avec DJ internationaux',
        date: new Date('2025-11-25T22:00:00Z'),
        location: 'Accor Arena',
        maxCapacity: 8000,
        isPublished: true,
        categoryId: categories[0].id,
        organizerId: organizers[0].id,
      },
    }),
  ])

  console.log('3 evenements musicaux crees')

  // ====================================================================================
  // EVENEMENTS - Sports Manager
  // ====================================================================================
  
  const sportsEvents = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Match de Football - PSG vs OM',
        description: 'Le classique du championnat de France',
        date: new Date('2025-11-18T21:00:00Z'),
        location: 'Parc des Princes',
        maxCapacity: 47929,
        isPublished: true,
        categoryId: categories[1].id,
        organizerId: organizers[1].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Tournoi de Tennis - Masters Paris',
        description: 'Les meilleurs joueurs mondiaux a Paris Bercy',
        date: new Date('2025-11-22T14:00:00Z'),
        location: 'AccorHotels Arena',
        maxCapacity: 15000,
        isPublished: true,
        categoryId: categories[1].id,
        organizerId: organizers[1].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Marathon de Paris',
        description: 'Course mythique dans les rues de Paris',
        date: new Date('2025-12-05T08:00:00Z'),
        location: 'Champs-Elysees',
        maxCapacity: 50000,
        isPublished: true,
        categoryId: categories[1].id,
        organizerId: organizers[1].id,
      },
    }),
  ])

  console.log('3 evenements sportifs crees')

  // ====================================================================================
  // EVENEMENTS - Tech Conferences Inc
  // ====================================================================================
  
  const techEvents = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Conference Tech Innovation 2025',
        description: 'Les dernieres tendances en IA, Cloud et Cybersecurite',
        date: new Date('2025-11-28T09:00:00Z'),
        location: 'Centre de congres Porte Maillot',
        maxCapacity: 800,
        isPublished: true,
        categoryId: categories[2].id,
        organizerId: organizers[2].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'DevOps Summit Paris',
        description: 'Deux jours dedies aux pratiques DevOps et Cloud Native',
        date: new Date('2025-12-10T09:00:00Z'),
        location: 'Paris Convention Centre',
        maxCapacity: 1200,
        isPublished: true,
        categoryId: categories[2].id,
        organizerId: organizers[2].id,
      },
    }),
  ])

  console.log('2 conferences tech creees')

  // ====================================================================================
  // EVENEMENTS - Culture Events
  // ====================================================================================
  
  const cultureEvents = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Festival Gastronomique',
        description: 'Decouvrez les saveurs du monde avec nos chefs etoiles',
        date: new Date('2025-11-30T12:00:00Z'),
        location: 'Esplanade des Invalides',
        maxCapacity: 2000,
        isPublished: true,
        categoryId: categories[3].id,
        organizerId: organizers[3].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Theatre - Le Malade Imaginaire',
        description: 'La celebre piece de Moliere revisitee',
        date: new Date('2025-12-08T20:00:00Z'),
        location: 'Comedie Francaise',
        maxCapacity: 860,
        isPublished: true,
        categoryId: categories[4].id,
        organizerId: organizers[3].id,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Exposition Art Moderne',
        description: 'Collection exceptionnelle dart contemporain',
        date: new Date('2025-12-01T10:00:00Z'),
        location: 'Grand Palais',
        maxCapacity: 500,
        isPublished: true,
        categoryId: categories[5].id,
        organizerId: organizers[3].id,
      },
    }),
  ])

  console.log('3 evenements culturels crees')

  // ====================================================================================
  // COMMANDES
  // ====================================================================================
  
  const orders = await Promise.all([
    prisma.order.create({ data: { userId: users[0].id, status: 'paid', totalPrice: 90.00 } }),
    prisma.order.create({ data: { userId: users[0].id, status: 'paid', totalPrice: 40.00 } }),
    prisma.order.create({ data: { userId: users[1].id, status: 'paid', totalPrice: 135.00 } }),
    prisma.order.create({ data: { userId: users[2].id, status: 'paid', totalPrice: 120.00 } }),
    prisma.order.create({ data: { userId: users[2].id, status: 'pending_payment', totalPrice: 70.00 } }),
    prisma.order.create({ data: { userId: users[3].id, status: 'paid', totalPrice: 85.00 } }),
    prisma.order.create({ data: { userId: users[4].id, status: 'paid', totalPrice: 150.00 } }),
    prisma.order.create({ data: { userId: users[4].id, status: 'paid', totalPrice: 35.00 } }),
  ])

  // Creer les tickets
  await Promise.all([
    prisma.ticket.create({ data: { userId: users[0].id, eventId: musicEvents[0].id, orderId: orders[0].id, code: 'TICKET-ALICE-001', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[0].id, eventId: musicEvents[0].id, orderId: orders[0].id, code: 'TICKET-ALICE-002', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[0].id, eventId: cultureEvents[0].id, orderId: orders[1].id, code: 'TICKET-ALICE-003', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[1].id, eventId: sportsEvents[0].id, orderId: orders[2].id, code: 'TICKET-BOB-001', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[1].id, eventId: sportsEvents[0].id, orderId: orders[2].id, code: 'TICKET-BOB-002', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[1].id, eventId: sportsEvents[0].id, orderId: orders[2].id, code: 'TICKET-BOB-003', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[2].id, eventId: techEvents[0].id, orderId: orders[3].id, code: 'TICKET-CLAIRE-001', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[2].id, eventId: cultureEvents[1].id, orderId: orders[4].id, code: 'TICKET-CLAIRE-002', status: 'pending' } }),
    prisma.ticket.create({ data: { userId: users[2].id, eventId: cultureEvents[1].id, orderId: orders[4].id, code: 'TICKET-CLAIRE-003', status: 'pending' } }),
    prisma.ticket.create({ data: { userId: users[3].id, eventId: musicEvents[1].id, orderId: orders[5].id, code: 'TICKET-DAVID-001', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[4].id, eventId: sportsEvents[1].id, orderId: orders[6].id, code: 'TICKET-EMMA-001', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[4].id, eventId: sportsEvents[1].id, orderId: orders[6].id, code: 'TICKET-EMMA-002', status: 'paid' } }),
    prisma.ticket.create({ data: { userId: users[4].id, eventId: musicEvents[2].id, orderId: orders[7].id, code: 'TICKET-EMMA-003', status: 'paid' } }),
  ])

  console.log('8 commandes creees avec leurs tickets')
  console.log('')
  console.log('Seeding termine avec succes!')
  console.log('')
  console.log('==============================================')
  console.log('COMPTES DISPONIBLES:')
  console.log('==============================================')
  console.log('')
  console.log('Admin:')
  console.log('  - admin@demo.com / admin123')
  console.log('')
  console.log('Organisateurs (organizer123 pour tous):')
  console.log('  - music.events@demo.com')
  console.log('  - sports.manager@demo.com')
  console.log('  - tech.conferences@demo.com')
  console.log('  - culture.events@demo.com')
  console.log('')
  console.log('Utilisateurs (user123 pour tous):')
  console.log('  - alice.martin@demo.com')
  console.log('  - bob.dubois@demo.com')
  console.log('  - claire.bernard@demo.com')
  console.log('  - david.petit@demo.com')
  console.log('  - emma.durand@demo.com')
  console.log('')
  console.log('==============================================')
  console.log('STATISTIQUES:')
  console.log('==============================================')
  console.log('  1 Admin')
  console.log('  4 Organisateurs')
  console.log('  5 Utilisateurs')
  console.log('  11 Evenements')
  console.log('  8 Commandes')
  console.log('  13 Tickets')
  console.log('==============================================')
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
