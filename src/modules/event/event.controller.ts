import { AuthenticatedRequest } from '@/middlewares/auth';
import { NextApiResponse } from 'next';
import { z } from 'zod';
import * as eventService from './event.service';

const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  price: z.number().nonnegative().optional(),
  capacity: z.number().positive().optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
});

const updateEventSchema = createEventSchema.partial();

export async function list(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const events = await eventService.list();
    return res.status(200).json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function create(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Only organizers and admins can create events
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANISATEUR') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const parseResult = createEventSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }
    
    const event = await eventService.create({
      ...parseResult.data,
      organizerId: req.user.id
    });
    
    return res.status(201).json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const eventId = parseInt(req.query.id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const event = await eventService.getById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // If event is not public, only the organizer and admins can view it
    if (!event.isPublic && req.user) {
      if (req.user.id !== event.organizerId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    
    return res.status(200).json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function updateById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const eventId = parseInt(req.query.id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const event = await eventService.getById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only the organizer and admins can update the event
    if (req.user.id !== event.organizerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const parseResult = updateEventSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }
    
    const updatedEvent = await eventService.updateById(eventId, parseResult.data);
    return res.status(200).json(updatedEvent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function deleteById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const eventId = parseInt(req.query.id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const event = await eventService.getById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only the organizer and admins can delete the event
    if (req.user.id !== event.organizerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    await eventService.deleteById(eventId);
    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getEventTickets(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const eventId = parseInt(req.query.id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const event = await eventService.getById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only the organizer and admins can view all tickets
    if (req.user.id !== event.organizerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const tickets = await eventService.getEventTickets(eventId);
    return res.status(200).json(tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getEventStats(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const eventId = parseInt(req.query.id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const event = await eventService.getById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only the organizer and admins can view stats
    if (req.user.id !== event.organizerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const stats = await eventService.getEventStats(eventId);
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function validateTicket(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const eventId = parseInt(req.query.id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const event = await eventService.getById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only the organizer and admins can validate tickets
    if (req.user.id !== event.organizerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ message: 'Ticket ID is required' });
    }
    
    const result = await eventService.validateTicket(eventId, ticketId);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getPublicEvents(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const events = await eventService.getPublicEvents();
    return res.status(200).json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getFeaturedEvents(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const events = await eventService.getFeaturedEvents();
    return res.status(200).json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function searchEvents(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { query, category, startDate, endDate, location } = req.query;
    
    const events = await eventService.searchEvents({
      query: query as string,
      category: category as string,
      startDate: startDate as string,
      endDate: endDate as string,
      location: location as string
    });
    
    return res.status(200).json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}