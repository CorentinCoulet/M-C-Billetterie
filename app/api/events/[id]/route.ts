import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCachedEvent, invalidateCategoriesCache, invalidateEventCache } from '../../../../src/lib/cache-helpers';
import {
  NextApiResponse,
  validateBody,
  withAuth
} from '../../../../src/lib/next-api-helpers';

const updateEventSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').optional(),
  description: z.string().optional(),
  location: z.string().min(1, 'La localisation est requise').optional(),
  date: z.string().datetime('Date invalide').optional(),
  maxCapacity: z.number().positive().optional(),
  isPublished: z.boolean().optional(),
  categoryId: z.string().optional(),
  venueId: z.string().optional(),
}).partial();

async function handleGetEvent(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
        
    // Use cached event
    const event = await getCachedEvent(id);

    if (!event) {
      return NextApiResponse.notFound('Événement non trouvé');
    }

    return NextApiResponse.success(event, 'Événement récupéré');
  } catch (error: any) {
    return NextApiResponse.error('Erreur lors de la récupération de l\'événement', 500);
  }
}

async function handleUpdateEvent(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(request, async (req, user) => {
    const { data, error } = await validateBody(req, updateEventSchema);
    if (error) return error;

    try {
      const { id } = context.params;
      
      // Import event service
      const eventServiceModule = await import('../../../../src/modules/event/event.service');
      
      // Update event
      const event = await eventServiceModule.updateById(id, data);

      // Invalidate event cache after update
      await invalidateEventCache(id);
      
      // If category or publication status changed, invalidate categories cache
      if (data.categoryId !== undefined || data.isPublished !== undefined) {
        await invalidateCategoriesCache();
      }

      return NextApiResponse.success(event, 'Événement mis à jour avec succès');
    } catch (error: any) {
      return NextApiResponse.error(
        error.message || 'Erreur lors de la mise à jour de l\'événement',
        500
      );
    }
  });
}

async function handleDeleteEvent(request: NextRequest, context: { params: { id: string } }) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = context.params;
      
      // Import event service
      const eventServiceModule = await import('../../../../src/modules/event/event.service');
      
      // Delete event
      await eventServiceModule.deleteById(id);

      // Invalidate event cache after deletion
      await invalidateEventCache(id);
      await invalidateCategoriesCache();

      return NextApiResponse.success(null, 'Événement supprimé avec succès');
    } catch (error: any) {
      return NextApiResponse.error(
        error.message || 'Erreur lors de la suppression de l\'événement',
        500
      );
    }
  });
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return handleGetEvent(request, context);
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  return handleUpdateEvent(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return handleDeleteEvent(request, context);
}
