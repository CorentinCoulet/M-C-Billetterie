import { NextApiResponse } from 'next';
import { eventController } from '../../../src/utils/test-controllers';
import {
    createAuthenticatedRequest,
    createMockRequest,
    expectError,
    expectForbidden,
    expectNotFound,
    expectSuccess,
    expectUnauthorized,
    expectValidationError,
    Role
} from '../../utils/helpers';

describe('Events API', () => {
  // Helper function to create a test user
  function createTestUser(role: Role = 'USER') {
    return {
      id: `user-${Math.floor(Math.random() * 1000)}`,
      email: `test-${Date.now()}@example.com`,
      password: 'hashed_password',
      name: 'Test User',
      role,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Helper function to create a test event
  function createTestEvent(organizerId: string, isPublished = true) {
    return {
      id: Math.floor(Math.random() * 1000),
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
    };
  }

  describe('GET /api/events', () => {
    it('should return all events', async () => {
      const user = createTestUser();
      const event1 = createTestEvent(user.id);
      const event2 = createTestEvent(user.id);

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await eventController.list(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const events = res._getJSONData();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('POST /api/events', () => {
    it('should create a new event when authenticated', async () => {
      const user = createTestUser();
      
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
      const user = createTestUser();
      
      const invalidEventData = {
        title: 'New Event',
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
      const user = createTestUser();
      const event = createTestEvent(user.id);

      const { req, res } = createMockRequest({
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', event.id.toString());
      expect(res._getJSONData()).toHaveProperty('title', 'Test Event');
    });

    it('should return not found for non-existent event', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
        query: { id: '99999' }
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
      const user = createTestUser();
      const event = createTestEvent(user.id);

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
      expect(res._getJSONData()).toHaveProperty('id', event.id.toString());
      expect(res._getJSONData()).toHaveProperty('title', updateData.title);
      expect(res._getJSONData()).toHaveProperty('description', updateData.description);
    });

    it('should update event by ID for admin', async () => {
      const user = createTestUser();
      const admin = createTestUser('ADMIN');
      const event = createTestEvent(user.id);

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
      expect(res._getJSONData()).toHaveProperty('id', event.id.toString());
      expect(res._getJSONData()).toHaveProperty('title', updateData.title);
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = createTestUser();
      const otherUser = {
        ...createTestUser(),
        email: 'other-user@example.com'
      };
      const event = createTestEvent(organizer.id);

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
      const user = createTestUser();
      const event = createTestEvent(user.id);

      const invalidUpdateData = {
        startDate: 'invalid-date'
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
      const user = createTestUser();
      const event = createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'DELETE',
        query: { id: event.id.toString() }
      });

      await eventController.deleteById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/deleted/i);
    });

    it('should delete event by ID for admin', async () => {
      const user = createTestUser();
      const admin = createTestUser('ADMIN');
      const event = createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'DELETE',
        query: { id: event.id.toString() }
      });

      await eventController.deleteById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/deleted/i);
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = createTestUser();
      const otherUser = {
        ...createTestUser(),
        email: 'other-user@example.com'
      };
      const event = createTestEvent(organizer.id);

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'DELETE',
        query: { id: event.id.toString() }
      });

      await eventController.deleteById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('GET /api/events/:id/tickets', () => {
    it('should return tickets for an event', async () => {
      const user = createTestUser();
      const event = createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventTickets(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(Array.isArray(res._getJSONData())).toBe(true);
    });

    it('should return not found for non-existent event', async () => {
      const user = createTestUser();

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: '99999' }
      });

      await eventController.getEventTickets(req as any, res as NextApiResponse);

      expectNotFound(res);
    });
  });

  describe('GET /api/events/:id/stats', () => {
    it('should return stats for an event for the organizer', async () => {
      const user = createTestUser();
      const event = createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventStats(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
    });

    it('should return stats for an event for admin', async () => {
      const user = createTestUser();
      const admin = createTestUser('ADMIN');
      const event = createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'GET',
        query: { id: event.id.toString() }
      });

      await eventController.getEventStats(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = createTestUser();
      const otherUser = {
        ...createTestUser(),
        email: 'other-user@example.com'
      };
      const event = createTestEvent(organizer.id);

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
      const user = createTestUser();
      const event = createTestEvent(user.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        query: { id: event.id.toString() },
        body: { ticketCode: 'TICKET123' }
      });

      await eventController.validateTicket(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('status', 'VALIDATED');
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = createTestUser();
      const otherUser = {
        ...createTestUser(),
        email: 'other-user@example.com'
      };
      const event = createTestEvent(organizer.id);

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'POST',
        query: { id: event.id.toString() },
        body: { ticketCode: 'TICKET456' }
      });

      await eventController.validateTicket(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('GET /api/events/public', () => {
    it('should return public events', async () => {
      const user = createTestUser();
      const publicEvent = createTestEvent(user.id, true);
      const privateEvent = createTestEvent(user.id, false);

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await eventController.getPublicEvents(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const events = res._getJSONData();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('GET /api/events/featured', () => {
    it('should return featured events', async () => {
      const user = createTestUser();
      createTestEvent(user.id);
      createTestEvent(user.id);

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
      const user = createTestUser();

      // Search for "Paris"
      const { req: req1, res: res1 } = createMockRequest({
        method: 'GET',
        query: { q: 'Paris' }
      });

      await eventController.searchEvents(req1 as any, res1 as NextApiResponse);

      expectSuccess(res1, 200);
      const events1 = res1._getJSONData();
      expect(Array.isArray(events1)).toBe(true);

      // Search for "Festival"
      const { req: req2, res: res2 } = createMockRequest({
        method: 'GET',
        query: { q: 'Festival' }
      });

      await eventController.searchEvents(req2 as any, res2 as NextApiResponse);

      expectSuccess(res2, 200);
      const events2 = res2._getJSONData();
      expect(Array.isArray(events2)).toBe(true);
    });
  });
});