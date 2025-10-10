import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '../../../lib/logger';
import {
  createMethodHandler,
  NextApiResponse,
  validateBody,
  withAuth
} from '../../../src/lib/next-api-helpers';

const createEventSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().optional(),
  location: z.string().min(1, 'La localisation est requise'),
  date: z.string().datetime('Date invalide'),
  maxCapacity: z.number().positive().optional(),
  isPublished: z.boolean().default(false),
  categoryId: z.string().optional(),
  venueId: z.string().optional(),
  organizerId: z.string().min(1, 'Organisateur requis'),
});

async function handleGet(request: NextRequest) {
  try {
    logger.info('Fetching events list');

    // Import event service
    const eventServiceModule = await import('../../../src/modules/event/event.service');

    // Get events with filters - use the exported functions
    const events = await eventServiceModule.list();

    logger.info({ count: events?.length || 0 }, 'Events retrieved successfully');

    return NextApiResponse.success(events, 'Événements récupérés');
  } catch (error: any) {
    logger.error({ error }, 'Get events error');
    return NextApiResponse.error('Erreur lors de la récupération des événements', 500);
  }
}

async function handlePost(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    const { data, error } = await validateBody(req, createEventSchema);
    if (error) return error;

    try {
      logger.info({ userId: user.id, eventData: data }, 'Creating new event');

      // Import event service
      const eventServiceModule = await import('../../../src/modules/event/event.service');

      // Create event
      const event = await eventServiceModule.create(data);

      logger.info({ eventId: event.id, userId: user.id }, 'Event created successfully');

      return NextApiResponse.success(event, 'Événement créé avec succès', 201);
    } catch (error: any) {
      logger.error({ error, userId: user.id }, 'Create event error');
      return NextApiResponse.error(
        error.message || 'Erreur lors de la création de l\'événement',
        500
      );
    }
  });
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
