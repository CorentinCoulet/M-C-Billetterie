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
import * as ticketController from '@/modules/ticket/ticket.controller';

describe('Tickets API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Clean up tickets, events, and users before each test
    await testPrisma.ticket.deleteMany();
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
  async function createTestEvent(organizerId) {
    return testPrisma.event.create({
      data: {
        title: 'Test Event',
        description: 'This is a test event',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 172800000), // Day after tomorrow
        location: 'Test Location',
        organizerId,
        isPublished: true,
        capacity: 100,
        price: 10.00,
        currency: 'EUR',
        category: 'CONCERT'
      }
    });
  }

  // Helper function to create a test ticket
  async function createTestTicket(userId, eventId, status = 'ISSUED') {
    return testPrisma.ticket.create({
      data: {
        userId,
        eventId,
        status,
        code: `TICKET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        price: 10.00
      }
    });
  }

  describe('GET /api/tickets', () => {
    it('should return tickets for the authenticated user', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const ticket1 = await createTestTicket(user.id, event.id);
      const ticket2 = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(user);

      await ticketController.list(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const tickets = res._getJSONData();
      expect(Array.isArray(tickets)).toBe(true);
      expect(tickets.length).toBeGreaterThanOrEqual(2);
      expect(tickets.some((t: any) => t.id === ticket1.id)).toBe(true);
      expect(tickets.some((t: any) => t.id === ticket2.id)).toBe(true);
    });

    it('should return all tickets for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);
      const ticket1 = await createTestTicket(user.id, event.id);
      const ticket2 = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(admin);

      await ticketController.list(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const tickets = res._getJSONData();
      expect(Array.isArray(tickets)).toBe(true);
      expect(tickets.length).toBeGreaterThanOrEqual(2);
      expect(tickets.some((t: any) => t.id === ticket1.id)).toBe(true);
      expect(tickets.some((t: any) => t.id === ticket2.id)).toBe(true);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await ticketController.list(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('POST /api/tickets', () => {
    it('should create a new ticket when authenticated', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const ticketData = {
        eventId: event.id.toString(),
        price: 15.00
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: ticketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectSuccess(res, 201);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('eventId', event.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('price', ticketData.price);
    });

    it('should return validation error for invalid input', async () => {
      const user = await createTestUser();

      const invalidTicketData = {
        // Missing eventId
        price: 15.00
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidTicketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectValidationError(res, 'eventId');
    });

    it('should return validation error for negative price', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const invalidTicketData = {
        eventId: event.id.toString(),
        price: -5.00 // Negative price
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidTicketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectValidationError(res, 'price');
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const ticketData = {
        eventId: event.id.toString(),
        price: 15.00
      };

      const { req, res } = createMockRequest({
        method: 'POST',
        body: ticketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/tickets/:id', () => {
    it('should return ticket by ID for the ticket owner', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const ticket = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('eventId', event.id);
    });

    it('should return ticket by ID for the event organizer', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const { req, res } = createAuthenticatedRequest(organizer, {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('userId', attendee.id);
      expect(res._getJSONData()).toHaveProperty('eventId', event.id);
    });

    it('should return ticket by ID for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);
      const ticket = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
    });

    it('should return forbidden for other users', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: '99999' } // Non-existent ID
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: 'invalid-id' }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid.*id/i);
    });
  });

  describe('POST /api/tickets/reserve', () => {
    it('should reserve tickets for an event', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const reserveData = {
        eventId: event.id,
        quantity: 2
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: reserveData
      });

      await ticketController.reserve(req as any, res as NextApiResponse);

      expectSuccess(res, 201);
      const tickets = res._getJSONData();
      expect(Array.isArray(tickets)).toBe(true);
      expect(tickets.length).toBe(2);
      expect(tickets[0]).toHaveProperty('eventId', event.id);
      expect(tickets[0]).toHaveProperty('userId', user.id);
      expect(tickets[1]).toHaveProperty('eventId', event.id);
      expect(tickets[1]).toHaveProperty('userId', user.id);
    });

    it('should return validation error for invalid input', async () => {
      const user = await createTestUser();

      const invalidReserveData = {
        // Missing eventId
        quantity: 2
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidReserveData
      });

      await ticketController.reserve(req as any, res as NextApiResponse);

      expectValidationError(res, 'eventId');
    });

    it('should return validation error for invalid quantity', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const invalidReserveData = {
        eventId: event.id,
        quantity: 0 // Invalid quantity
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidReserveData
      });

      await ticketController.reserve(req as any, res as NextApiResponse);

      expectValidationError(res, 'quantity');
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const reserveData = {
        eventId: event.id,
        quantity: 2
      };

      const { req, res } = createMockRequest({
        method: 'POST',
        body: reserveData
      });

      await ticketController.reserve(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('POST /api/tickets/validate', () => {
    it('should validate a ticket for the event organizer', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const validateData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(organizer, {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'VALIDATED');
    });

    it('should validate a ticket for admin', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const validateData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'VALIDATED');
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const validateData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const organizer = await createTestUser();
      const event = await createTestEvent(organizer.id);

      const validateData = {
        ticketId: 99999 // Non-existent ID
      };

      const { req, res } = createAuthenticatedRequest(organizer, {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for missing ticket ID', async () => {
      const organizer = await createTestUser();
      const event = await createTestEvent(organizer.id);

      const validateData = {
        // Missing ticketId
      };

      const { req, res } = createAuthenticatedRequest(organizer, {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/ticket.*id.*required/i);
    });
  });

  describe('POST /api/tickets/cancel', () => {
    it('should cancel a ticket for the ticket owner', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const ticket = await createTestTicket(user.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'CANCELLED');
    });

    it('should cancel a ticket for the event organizer', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(organizer, {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'CANCELLED');
    });

    it('should cancel a ticket for admin', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'CANCELLED');
    });

    it('should return forbidden for other users', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const user = await createTestUser();

      const cancelData = {
        ticketId: 99999 // Non-existent ID
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for missing ticket ID', async () => {
      const user = await createTestUser();

      const cancelData = {
        // Missing ticketId
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/ticket.*id.*required/i);
    });
  });

  describe('GET /api/tickets/:id/download', () => {
    it('should download a ticket for the ticket owner', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const ticket = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      // Mock the PDF generation function
      jest.spyOn(ticketController, 'download').mockImplementation(async (req, res) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.pdf"`);
        res.status(200).send(Buffer.from('mock pdf content'));
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expect(res.statusCode).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('application/pdf');
      expect(res.getHeader('Content-Disposition')).toMatch(new RegExp(`ticket-${ticket.id}.pdf`));
    });

    it('should return forbidden for non-ticket owners', async () => {
      const organizer = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: '99999' } // Non-existent ID
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: 'invalid-id' }
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid.*id/i);
    });
  });
});