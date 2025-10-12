import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  ADMIN_FIXTURE,
  CATEGORY_FIXTURES,
  ORDER_FIXTURES,
  ORGANIZER_FIXTURES,
  SEED_SUMMARY,
  USER_FIXTURES,
} from '../src/data/fixtures/seed';
import { PrismaClient } from '../src/generated/prisma';

type SeedPasswordSource = 'env' | 'generated';

interface SeedPassword {
  envKey: string;
  label: string;
  plain: string;
  source: SeedPasswordSource;
}

const prisma = new PrismaClient();
const SEED_SALT_ROUNDS = Number(process.env.SEED_BCRYPT_ROUNDS || 12);

function resolveSeedPassword(envKey: string, label: string): SeedPassword {
  const rawValue = process.env[envKey]?.trim();

  if (rawValue && rawValue.length >= 8) {
    return { envKey, label, plain: rawValue, source: 'env' };
  }

  const generated = crypto.randomBytes(12).toString('hex');
  console.warn(
    `ℹ️  ${envKey} manquant ou trop court. Un mot de passe éphémère a été généré pour ${label}.`
  );

  return { envKey, label, plain: generated, source: 'generated' };
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, SEED_SALT_ROUNDS);
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.ticket.deleteMany(),
    prisma.order.deleteMany(),
    prisma.event.deleteMany(),
    prisma.organizer.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createCategories() {
  const categories = await prisma.$transaction(
    CATEGORY_FIXTURES.map((category) =>
      prisma.category.create({ data: { name: category.name } })
    )
  );

  const categoryByName = new Map<string, string>();
  categories.forEach((category) => {
    categoryByName.set(category.name, category.id);
  });

  return categoryByName;
}

async function createAdmin(passwordHash: string, userMap: Map<string, string>) {
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_FIXTURE.email,
      name: ADMIN_FIXTURE.name,
      password: passwordHash,
      role: ADMIN_FIXTURE.role,
      isVerified: ADMIN_FIXTURE.isVerified ?? true,
    },
  });

  userMap.set(admin.email, admin.id);
  return admin;
}

async function createOrganizers(
  organizerPasswordHash: string,
  categoryByName: Map<string, string>,
  userMap: Map<string, string>
) {
  const eventByTitle = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const organizerFixture of ORGANIZER_FIXTURES) {
      const organizerUser = await tx.user.create({
        data: {
          email: organizerFixture.email,
          name: organizerFixture.name,
          password: organizerPasswordHash,
          role: organizerFixture.role,
          isVerified: organizerFixture.isVerified ?? true,
        },
      });

      userMap.set(organizerUser.email, organizerUser.id);

      const organizerEntity = await tx.organizer.create({
        data: { name: organizerFixture.name },
      });

      for (const eventFixture of organizerFixture.events) {
        const categoryId = categoryByName.get(eventFixture.category);

        if (!categoryId) {
          throw new Error(`Categorie introuvable pour ${eventFixture.category}`);
        }

        const event = await tx.event.create({
          data: {
            title: eventFixture.title,
            description: eventFixture.description,
            date: new Date(eventFixture.date),
            location: eventFixture.location,
            maxCapacity: eventFixture.maxCapacity,
            isPublished: eventFixture.isPublished ?? true,
            categoryId,
            organizerId: organizerEntity.id,
          },
        });

        eventByTitle.set(event.title, event.id);
      }
    }
  });

  return eventByTitle;
}

async function createUsers(userPasswordHash: string, userMap: Map<string, string>) {
  const users = await prisma.$transaction(
    USER_FIXTURES.map((fixture) =>
      prisma.user.create({
        data: {
          email: fixture.email,
          name: fixture.name,
          password: userPasswordHash,
          role: fixture.role,
          isVerified: fixture.isVerified ?? true,
        },
      })
    )
  );

  users.forEach((user) => userMap.set(user.email, user.id));
  return users;
}

async function createOrders(
  userMap: Map<string, string>,
  eventMap: Map<string, string>
) {
  return prisma.$transaction(async (tx) => {
    const createdOrders = [];

    for (const orderFixture of ORDER_FIXTURES) {
      const userId = userMap.get(orderFixture.userEmail);

      if (!userId) {
        throw new Error(`Utilisateur introuvable pour l'ordre ${orderFixture.userEmail}`);
      }

      const order = await tx.order.create({
        data: {
          userId,
          totalPrice: orderFixture.totalPrice,
          status: orderFixture.status,
          tickets: {
            create: orderFixture.tickets.map((ticket) => {
              const eventId = eventMap.get(ticket.eventTitle);

              if (!eventId) {
                throw new Error(`Événement introuvable pour le billet ${ticket.code}`);
              }

              return {
                code: ticket.code,
                status: ticket.status,
                eventId,
                userId,
              };
            }),
          },
        },
        include: { tickets: true },
      });

      createdOrders.push(order);
    }

    return createdOrders;
  });
}

function logSummary(passwords: SeedPassword[]) {
  console.log('');
  console.log('Seeding terminé avec succès!');
  console.log('');
  console.log('==============================================');
  console.log('COMPTES DISPONIBLES:');
  console.log('==============================================');
  console.log('');
  console.log('Admin:');
  const adminPassword = passwords.find((pwd) => pwd.envKey === 'SEED_ADMIN_PASSWORD');
  console.log(`  - ${ADMIN_FIXTURE.email} / ${adminPassword?.plain ?? 'mot de passe indisponible'}`);
  console.log('');
  console.log('Organisateurs:');
  ORGANIZER_FIXTURES.forEach((organizer) => {
    console.log(`  - ${organizer.email}`);
  });
  const organizerPassword = passwords.find((pwd) => pwd.envKey === 'SEED_ORGANIZER_PASSWORD');
  console.log(`    Mot de passe partagé: ${organizerPassword?.plain ?? 'mot de passe indisponible'}`);
  console.log('');
  console.log('Utilisateurs:');
  USER_FIXTURES.forEach((user) => {
    console.log(`  - ${user.email}`);
  });
  const userPassword = passwords.find((pwd) => pwd.envKey === 'SEED_USER_PASSWORD');
  console.log(`    Mot de passe partagé: ${userPassword?.plain ?? 'mot de passe indisponible'}`);
  console.log('');
  console.log('==============================================');
  console.log('STATISTIQUES:');
  console.log('==============================================');
  console.log(`  ${SEED_SUMMARY.admins} Admin`);
  console.log(`  ${SEED_SUMMARY.organizers} Organisateurs`);
  console.log(`  ${SEED_SUMMARY.users} Utilisateurs`);
  console.log(`  ${SEED_SUMMARY.events} Événements`);
  console.log(`  ${SEED_SUMMARY.orders} Commandes`);
  console.log('');
  console.log('Sources des mots de passe:');
  passwords.forEach((pwd) => {
    const sourceLabel =
      pwd.source === 'env'
        ? 'provenant des variables d\'environnement'
        : 'généré pour cette exécution';
    console.log(`  - ${pwd.label}: ${sourceLabel}`);
  });
  console.log('==============================================');
}

async function main() {
  console.log('Début du seeding...');

  const passwords: SeedPassword[] = [
    resolveSeedPassword('SEED_ADMIN_PASSWORD', 'Compte administrateur'),
    resolveSeedPassword('SEED_ORGANIZER_PASSWORD', 'Comptes organisateurs'),
    resolveSeedPassword('SEED_USER_PASSWORD', 'Comptes utilisateurs'),
  ];

  const [adminPasswordHash, organizerPasswordHash, userPasswordHash] = await Promise.all(
    passwords.map((pwd) => hashPassword(pwd.plain))
  );

  await resetDatabase();
  console.log('Base de données nettoyée');

  const categoryByName = await createCategories();
  console.log(`${categoryByName.size} catégories créées`);

  const userMap = new Map<string, string>();
  await createAdmin(adminPasswordHash, userMap);
  console.log('Administrateur créé');

  const eventMap = await createOrganizers(organizerPasswordHash, categoryByName, userMap);
  console.log(`${eventMap.size} événements créés via ${ORGANIZER_FIXTURES.length} organisateurs`);

  await createUsers(userPasswordHash, userMap);
  console.log(`${USER_FIXTURES.length} utilisateurs finaux créés`);

  await createOrders(userMap, eventMap);
  console.log(`${ORDER_FIXTURES.length} commandes générées`);

  logSummary(passwords);
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
