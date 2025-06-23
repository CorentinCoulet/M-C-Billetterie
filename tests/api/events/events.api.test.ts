import { NextApiResponse } from 'next';
import { testPrisma, setupTests, teardownTests } from '../../../utils/setup';
import {
  createMockRequest,
  createAuthenticatedRequest,
  expectSuccess,
  expectError,
  expectValidationError,
  expectUnauthorized,
  expectForbidden,
  expectNotFound,
  hashTestPassword,
  generateRandomEmail
} from '../../../utils/helpers';
import * as eventController from '@/modules/event/event.controller';

describe('Events API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Clean up events and users before each test
    await testPrisma.event.deleteMany();
    await testPrisma.user.deleteMany();
  });

  // Helper function to create a test user
  async function createTestUser(role = 'USER') {
    return testPrisma.user.create({
      data: {
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role,
        isEmailVerified: true
      }
    });
  }

  // Helper function to create a test event
  async function createTestEvent(organizerId, isPublished = true) {
    return testPrisma.event.create({
      data: {
        title: 'Test Event',
        description: 'This is a test event',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 172800000), // Day after tomorrow
        location: 'Test Location',
        organizerId,
        isPublished,
        capacity: 100,
        price: 10.00,
        currency: 'EUR',
        category: 'CONCERT'
      }
    });
  }

  describe('GET /api/events', () => {
    it('should return all events', async () => {
      const user = await createTestUser();
      const event1 = await createTestEvent(user.id);
      const event2 = await createTestEvent(user.id);

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await eventController.list(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const events = res._getJSONData();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some((e: any) => e.id === event1.id)).toBe(true);
      expect(events.some((e: any) => e.id === event2.id)).toBe(true);
    });
  });

  describe('POST /api/events', () => {
    it('should create a new event when authenticated', async () => {
      const user = await createTestUser();
      
      const eventData = {
        title: 'New Event',
        description: 'This is a new event',
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        location: 'New Location',
        capacity: 200,
        price: 20.00,
        currency: 'EUR',
        category: 'CONCERT',
        isPublished: true
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: eventData
      });

      await eventController.create(req as any, res as NextApiResponse);

      expectSuccess(res, 201);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('title', eventData.title);
      expect(res._getJSONData()).toHaveProperty('organizerId', user.id);
    });

    it('should return validation error for invalid input', async () => {
      const user = await createTestUser();
      
      const invalidEventData = {
        // Missing required fields
        title: 'New Event',
        // No description, dates, location, etc.
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidEventData
      });

      await eventController.create(req as any, res as NextApiResponse);

      expectValidationError(res);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const eventData = {
        title: 'New Event',
        description: 'This is a new event',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'New Location',
        capacity: 200,
        price: 20.00,
        currency: 'EUR',
        category: 'CONCERT',
        isPublished: true
      };

      const { req, res } = createMockRequest({
        method: 'POST',
        body: eventData
      });

      await eventController.create(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return event by ID', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const { req, res } = createMockRequest({
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', event.id);
      expect(res._getJSONData()).toHaveProperty('title', event.title);
    });

    it('should return not found for non-existent event', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
        query: { id: '99999' } // Non-existent ID
      });

      await eventController.getById(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
        query: { id: 'invalid-id' }
      });

      await eventController.getById(req as any, res as NextApiResponse);

      expectError(res, 400);
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event by ID for the organizer', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description'
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'PUT',
        query: { id: event.id.toString() },
        body: updateData
      });

      await eventController.updateById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', event.id);
      expect(res._getJSONData()).toHaveProperty('title', updateData.title);
      expect(res._getJSONData()).toHaveProperty('description', updateData.description);
    });

    it('should update event by ID for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);

      const updateData = {
        title: 'Admin Updated Title',
        description: 'Admin updated description'
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'PUT',
        query: { id: event.id.toString() },
        body: updateData
      });

      await eventController.updateById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', event.id);
      expect(res._getJSONData()).toHaveProperty('title', updateData.title);
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);

      const updateData = {
        title: 'Attempted Update',
        description: 'This should not work'
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'PUT',
        query: { id: event.id.toString() },
        body: updateData
      });

      await eventController.updateById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return validation error for invalid input', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const invalidUpdateData = {
        startDate: 'invalid-date' // Invalid date format
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'PUT',
        query: { id: event.id.toString() },
        body: invalidUpdateData
      });

      await eventController.updateById(req as any, res as NextApiResponse);

      expectValidationError(res);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete event by ID for the organizer', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'DELETE',
        query: { id: event.id.toString() }
      });

      await eventController.deleteById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/deleted/i);

      // Verify event was deleted
      const deletedEvent = await testPrisma.event.findUnique({
        where: { id: event.id }
      });
      expect(deletedEvent).toBeNull();
    });

    it('should delete event by ID for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'DELETE',
        query: { id: event.id.toString() }
      });

      await eventController.deleteById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/deleted/i);

      // Verify event was deleted
      const deletedEvent = await testPrisma.event.findUnique({
        where: { id: event.id }
      });
      expect(deletedEvent).toBeNull();
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'DELETE',
        query: { id: event.id.toString() }
      });

      await eventController.deleteById(req as any, res as NextApiResponse);

      expectForbidden(res);

      // Verify event was not deleted
      const notDeletedEvent = await testPrisma.event.findUnique({
        where: { id: event.id }
      });
      expect(notDeletedEvent).not.toBeNull();
    });
  });

  describe('GET /api/events/:id/tickets', () => {
    it('should return tickets for an event', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventTickets(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(Array.isArray(res._getJSONData())).toBe(true);
    });

    it('should return not found for non-existent event', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: '99999' } // Non-existent ID
      });

      await eventController.getEventTickets(req as any, res as NextApiResponse);

      expectNotFound(res);
    });
  });

  describe('GET /api/events/:id/stats', () => {
    it('should return stats for an event for the organizer', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventStats(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      // The exact structure of stats would depend on the implementation
      // but we can at least verify it returns a successful response
    });

    it('should return stats for an event for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventStats(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventStats(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('POST /api/events/:id/validate-ticket', () => {
    it('should validate a ticket for the organizer', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      
      // Create a ticket for validation
      const ticket = await testPrisma.ticket.create({
        data: {
          eventId: event.id,
          userId: user.id,
          status: 'ISSUED',
          code: 'TICKET123',
          price: 10.00
        }
      });

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        query: { id: event.id.toString() },
        body: { ticketCode: ticket.code }
      });

      await eventController.validateTicket(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('status', 'VALIDATED');
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);
      
      // Create a ticket
      const ticket = await testPrisma.ticket.create({
        data: {
          eventId: event.id,
          userId: otherUser.id,
          status: 'ISSUED',
          code: 'TICKET456',
          price: 10.00
        }
      });

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'POST',
        query: { id: event.id.toString() },
        body: { ticketCode: ticket.code }
      });

      await eventController.validateTicket(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('GET /api/events/public', () => {
    it('should return public events', async () => {
      const user = await createTestUser();
      const publicEvent = await createTestEvent(user.id, true);
      const privateEvent = await createTestEvent(user.id, false);

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await eventController.getPublicEvents(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const events = res._getJSONData();
      expect(Array.isArray(events)).toBe(true);
      expect(events.some((e: any) => e.id === publicEvent.id)).toBe(true);
      expect(events.some((e: any) => e.id === privateEvent.id)).toBe(false);
    });
  });

  describe('GET /api/events/featured', () => {
    it('should return featured events', async () => {
      const user = await createTestUser();
      await createTestEvent(user.id);
      await createTestEvent(user.id);

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await eventController.getFeaturedEvents(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const events = res._getJSONData();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('GET /api/events/search', () => {
    it('should search events by query', async () => {
      const user = await createTestUser();
      
      // Create events with specific titles for search
      const event1 = await testPrisma.event.create({
        data: {
          title: 'Concert in Paris',
          description: 'A music concert',
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 172800000),
          location: 'Paris',
          organizerId: user.id,
          isPublished: true,
          capacity: 100,
          price: 10.00,
          currency: 'EUR',
          category: 'CONCERT'
        }
      });

      const event2 = await testPrisma.event.create({
        data: {
          title: 'Festival in London',
          description: 'A music festival',
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 172800000),
          location: 'London',
          organizerId: user.id,
          isPublished: true,
          capacity: 200,
          price: 20.00,
          currency: 'EUR',
          category: 'FESTIVAL'
        }
      });

      // Search for "Paris"
      const { req: req1, res: res1 } = createMockRequest({
        method: 'GET',
        query: { q: 'Paris' }
      });

      await eventController.searchEvents(req1 as any, res1 as NextApiResponse);

      expectSuccess(res1, 200);
      const events1 = res1._getJSONData();
      expect(Array.isArray(events1)).toBe(true);
      expect(events1.some((e: any) => e.id === event1.id)).toBe(true);
      expect(events1.some((e: any) => e.id === event2.id)).toBe(false);

      // Search for "Festival"
      const { req: req2, res: res2 } = createMockRequest({
        method: 'GET',
        query: { q: 'Festival' }
      });

      await eventController.searchEvents(req2 as any, res2 as NextApiResponse);

      expectSuccess(res2, 200);
      const events2 = res2._getJSONData();
      expect(Array.isArray(events2)).toBe(true);
      expect(events2.some((e: any) => e.id === event1.id)).toBe(false);
      expect(events2.some((e: any) => e.id === event2.id)).toBe(true);
    });
  });
});