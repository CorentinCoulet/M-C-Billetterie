import { NextApiResponse } from 'next';
import { ticketController } from '../../../src/utils/test-controllers';
import {
    createAuthenticatedRequest,
    createMockRequest,
    expectError,
    expectForbidden,
    expectNotFound,
    expectSuccess,
    expectUnauthorized,
    expectValidationError,
    generateRandomEmail,
    hashTestPassword,
    Role,
    User
} from '../../utils/helpers';
import { setupTests, teardownTests, testPrisma } from '../../utils/setup';
function toTestUser(prismaUser: any): Partial<User> {
  return {
    id: prismaUser.id,
    email: prismaUser.email,
    name: prismaUser.name,
    role: prismaUser.role as Role,
    isEmailVerified: prismaUser.isVerified, // Map isVerified to isEmailVerified
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt
  };
}

describe('Tickets API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Reset the global storage before each test
    const { resetMockPrismaStorage } = require('../../mocks/prisma.mock');
    resetMockPrismaStorage();
  });

  afterEach(() => {
    // Restore all mocks after each test
    jest.restoreAllMocks();
  });

  // Helper function to create a test user
  async function createTestUser(role: Role = 'USER') {
    const user = await testPrisma.user.create({
      data: {
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role,
        isVerified: true
      }
    });
    return user;
  }

  // Helper function to create a test organizer
  async function createTestOrganizer(userId?: string) {
    const organizerData = {
      name: 'Test Organizer',
      ...(userId && { userId: userId })
    };
    
    const organizer = await testPrisma.organizer.create({
      data: organizerData
    });
    return organizer;
  }

  // Helper function to create a test event
  async function createTestEvent(organizerId: string) {
    const event = await testPrisma.event.create({
      data: {
        title: 'Test Event',
        description: 'This is a test event',
        date: new Date(Date.now() + 86400000), // Tomorrow
        location: 'Test Location',
        organizerId: organizerId,  // Garder l'ID comme string
        isPublished: true,
        maxCapacity: 100,
        metadata: {}
      }
    });
    return event;
  }

  // Helper function to create a test ticket
  async function createTestTicket(userId: string, eventId: string, status: 'pending' | 'paid' | 'cancelled' | 'used' = 'paid') {
    const ticket = await testPrisma.ticket.create({
      data: {
        userId: userId,  // Garder l'ID comme string
        eventId: eventId,  // Garder l'ID comme string
        status,
        code: `TICKET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      }
    });
    return ticket;
  }

  describe('GET /api/tickets', () => {
    it('should return tickets for the authenticated user', async () => {
      console.log('=== DEBUT DU TEST: should return tickets for the authenticated user ===');
      
      const user = await createTestUser();
      console.log('User created:', user);
      
      const organizer = await createTestOrganizer();
      console.log('Organizer created:', organizer);
      
      const event = await createTestEvent(organizer.id);
      console.log('Event created:', event);
      
      const ticket1 = await createTestTicket(user.id, event.id);
      console.log('Ticket 1 created:', ticket1);
      
      const ticket2 = await createTestTicket(user.id, event.id);
      console.log('Ticket 2 created:', ticket2);

      // DEBUG: Vérifier ce qui est dans testPrisma vs globalStorage
      console.log('DEBUG: Checking mock state...');
      console.log('DEBUG: testPrisma instance:', !!testPrisma);
      console.log('DEBUG: testPrisma.ticket:', !!testPrisma.ticket);
      
      try {
        const allTicketsViaPrisma = await testPrisma.ticket.findMany({});
        console.log('DEBUG: All tickets via testPrisma.findMany():', allTicketsViaPrisma?.length || 0, allTicketsViaPrisma);
      } catch(e) {
        console.log('DEBUG: Error with testPrisma.findMany():', e);
      }

      // Vérifier le storage avant l'appel du contrôleur
      const { globalStorage } = require('../../mocks/prisma.mock');
      console.log('Storage before controller call:', {
        users: globalStorage.user?.length || 0,
        organizers: globalStorage.organizer?.length || 0,
        events: globalStorage.event?.length || 0,
        tickets: globalStorage.ticket?.length || 0
      });
      console.log('DEBUG: Raw storage content:', {
        users: globalStorage.user,
        organizers: globalStorage.organizer,
        events: globalStorage.event,
        tickets: globalStorage.ticket
      });

      const { req, res } = createAuthenticatedRequest(toTestUser(user));

      await ticketController.list(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const tickets = res._getJSONData();
      expect(Array.isArray(tickets)).toBe(true);
      expect(tickets.length).toBeGreaterThanOrEqual(2);
      expect(tickets.some((t: any) => t.id === ticket1.id)).toBe(true);
      expect(tickets.some((t: any) => t.id === ticket2.id)).toBe(true);
      
      console.log('=== FIN DU TEST: should return tickets for the authenticated user ===');
    });

    it('should return all tickets for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);
      const ticket1 = await createTestTicket(user.id, event.id);
      const ticket2 = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(admin));

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
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);

      const ticketData = {
        eventId: event.id.toString()
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'POST',
        body: ticketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectSuccess(res, 201);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('eventId', event.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
    });

    it('should return validation error for invalid input', async () => {
      const user = await createTestUser();

      const invalidTicketData = {
        // Missing eventId
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'POST',
        body: invalidTicketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectValidationError(res, 'eventId');
    });

    it('should return validation error for negative price', async () => {
      const user = await createTestUser();
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);

      const invalidTicketData = {
        eventId: event.id.toString(),
        price: -5.00 // Negative price
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'POST',
        body: invalidTicketData
      });

      await ticketController.create(req as any, res as NextApiResponse);

      expectValidationError(res, 'price');
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);

      const ticketData = {
        eventId: event.id.toString()
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
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
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
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(organizer_user), {
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
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(admin), {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
    });

    it('should return forbidden for other users', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(otherUser), {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'GET',
        query: { id: '99999999-9999-4999-9999-999999999999' } // Non-existent UUID
      });

      await ticketController.getById(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
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
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);

      const reserveData = {
        eventId: event.id,
        quantity: 2
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
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

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'POST',
        body: invalidReserveData
      });

      await ticketController.reserve(req as any, res as NextApiResponse);

      expectValidationError(res, 'eventId');
    });

    it('should return validation error for invalid quantity', async () => {
      const user = await createTestUser();
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);

      const invalidReserveData = {
        eventId: event.id,
        quantity: 0 // Invalid quantity
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'POST',
        body: invalidReserveData
      });

      await ticketController.reserve(req as any, res as NextApiResponse);

      expectValidationError(res, 'quantity');
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);

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
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const validateData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(organizer_user), {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'used');
    });

    it('should validate a ticket for admin', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const validateData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(admin), {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'used');
    });

    it('should return forbidden for non-organizer users', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const validateData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(otherUser), {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const organizer_user = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);

      const validateData = {
        ticketId: '99999999-9999-4999-9999-999999999999' // Non-existent UUID
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(organizer_user), {
        method: 'POST',
        body: validateData
      });

      await ticketController.validate(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for missing ticket ID', async () => {
      const organizer_user = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);

      const validateData = {
        // Missing ticketId
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(organizer_user), {
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
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(user.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'cancelled');
    });

    it('should cancel a ticket for the event organizer', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(organizer_user), {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'cancelled');
    });

    it('should cancel a ticket for admin', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(admin), {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', ticket.id);
      expect(res._getJSONData()).toHaveProperty('status', 'cancelled');
    });

    it('should return forbidden for other users', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const cancelData = {
        ticketId: ticket.id
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(otherUser), {
        method: 'POST',
        body: cancelData
      });

      await ticketController.cancel(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const user = await createTestUser();

      const cancelData = {
        ticketId: '99999999-9999-4999-9999-999999999999' // Non-existent UUID
      };

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
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

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
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
      const organizer = await createTestOrganizer();
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(user.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      // Mock the PDF generation function - will be restored by afterEach
      const downloadSpy = jest.spyOn(ticketController, 'download').mockImplementation(async (req, res) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.pdf"`);
        res.status(200).send(Buffer.from('mock pdf content'));
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expect(res.statusCode).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('application/pdf');
      expect(res.getHeader('Content-Disposition')).toMatch(new RegExp(`ticket-${ticket.id}.pdf`));
      
      // Verify the mock was called
      expect(downloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should return forbidden for non-ticket owners', async () => {
      const organizer_user = await createTestUser();
      const attendee = await createTestUser();
      const otherUser = await createTestUser();
      const organizer = await createTestOrganizer(organizer_user.id);
      const event = await createTestEvent(organizer.id);
      const ticket = await createTestTicket(attendee.id, event.id);

      const { req, res } = createAuthenticatedRequest(toTestUser(otherUser), {
        method: 'GET',
        query: { id: ticket.id.toString() }
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent ticket', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'GET',
        query: { id: '99999999-9999-4999-9999-999999999999' } // Non-existent UUID
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      const user = await createTestUser();

      const { req, res } = createAuthenticatedRequest(toTestUser(user), {
        method: 'GET',
        query: { id: 'invalid-id' }
      });

      await ticketController.download(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid.*id/i);
    });
  });
});
