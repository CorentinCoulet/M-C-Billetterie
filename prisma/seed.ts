// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding...')

  // Nettoyer les données existantes
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.event.deleteMany()
  await prisma.user.deleteMany()

  // Créer les utilisateurs
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin Demo',
      role: 'ADMIN',
      isActive: true,
    },
  })

  const organizer = await prisma.user.create({
    data: {
      email: 'org@demo.com',
      password: hashedPassword,
      name: 'Organisateur Demo',
      role: 'ORGANIZER',
      isActive: true,
    },
  })

  const user = await prisma.user.create({
    data: {
      email: 'user@demo.com',
      password: hashedPassword,
      name: 'Utilisateur Demo',
      role: 'USER',
      isActive: true,
    },
  })

  console.log('👥 Utilisateurs créés')

  // Créer des événements
  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Concert Rock - Les Légendes',
        description: 'Une soirée inoubliable avec les plus grands hits du rock',
        startTime: new Date('2024-03-15T20:00:00Z'),
        endTime: new Date('2024-03-15T23:00:00Z'),
        location: 'Zénith de Paris',
        maxAttendees: 5000,
        price: 45.00,
        status: 'PUBLISHED',
        category: 'MUSIC',
        organizerId: organizer.id,
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Conférence Tech Innovation',
        description: 'Les dernières tendances en technologie et innovation',
        startTime: new Date('2024-03-20T09:00:00Z'),
        endTime: new Date('2024-03-20T18:00:00Z'),
        location: 'Centre de congrès Porte Maillot',
        maxAttendees: 800,
        price: 120.00,
        status: 'PUBLISHED',
        category: 'CONFERENCE',
        organizerId: organizer.id,
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Festival Gastronomique',
        description: 'Découvrez les saveurs du monde avec nos chefs étoilés',
        startTime: new Date('2024-03-25T12:00:00Z'),
        endTime: new Date('2024-03-25T22:00:00Z'),
        location: 'Esplanade des Invalides',
        maxAttendees: 2000,
        price: 75.00,
        status: 'PUBLISHED',
        category: 'FOOD',
        organizerId: organizer.id,
        isActive: true,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Match de Football',
        description: 'Championnat de France - Match de la saison',
        startTime: new Date('2024-03-30T15:00:00Z'),
        endTime: new Date('2024-03-30T17:00:00Z'),
        location: 'Stade de France',
        maxAttendees: 80000,
        price: 25.00,
        status: 'PUBLISHED',
        category: 'SPORTS',
        organizerId: organizer.id,
        isActive: true,
      },
    }),
  ])

  console.log('🎫 Événements créés')

  // Créer quelques commandes de démonstration
  await Promise.all([
    prisma.order.create({
      data: {
        userId: user.id,
        status: 'CONFIRMED',
        totalAmount: 90.00,
        paymentStatus: 'PAID',
        paymentMethod: 'CARD',
        orderItems: {
          create: [
            {
              eventId: events[0].id,
              quantity: 2,
              price: 45.00,
            },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        userId: user.id,
        status: 'PENDING',
        totalAmount: 120.00,
        paymentStatus: 'PENDING',
        paymentMethod: 'CARD',
        orderItems: {
          create: [
            {
              eventId: events[1].id,
              quantity: 1,
              price: 120.00,
            },
          ],
        },
      },
    }),
  ])

  console.log('🛒 Commandes créées')

  console.log('✅ Seeding terminé avec succès!')
  console.log('🔐 Comptes créés:')
  console.log('   Admin: admin@demo.com / demo123')
  console.log('   Organisateur: org@demo.com / demo123')
  console.log('   Utilisateur: user@demo.com / demo123')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
