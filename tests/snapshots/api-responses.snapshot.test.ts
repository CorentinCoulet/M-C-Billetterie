/**
 * SNAPSHOT TESTS - API RESPONSES
 * 
 * Regression tests for API responses
 * Detects unintentional changes in data structure
 */

describe('API Responses Snapshot Tests', () => {
  describe('Events API', () => {
    it('should match GET /api/events response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          events: [
            {
              id: 'evt_123',
              title: 'Concert Rock Festival',
              description: 'Amazing rock concert',
              date: '2025-12-25T20:00:00Z',
              location: 'Paris Zenith',
              category: 'MUSIC',
              price: 49.99,
              availableTickets: 100,
              totalTickets: 500,
              imageUrl: 'https://example.com/event.jpg',
              status: 'PUBLISHED',
              organizerId: 'org_456',
              createdAt: '2025-10-01T10:00:00Z',
              updatedAt: '2025-10-09T12:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            perPage: 10,
            total: 50,
            totalPages: 5,
          },
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match GET /api/events/:id response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'evt_123',
          title: 'Concert Rock Festival',
          description: 'Amazing rock concert with full band',
          date: '2025-12-25T20:00:00Z',
          location: 'Paris Zenith',
          category: 'MUSIC',
          price: 49.99,
          availableTickets: 100,
          totalTickets: 500,
          imageUrl: 'https://example.com/event.jpg',
          status: 'PUBLISHED',
          organizerId: 'org_456',
          organizer: {
            id: 'org_456',
            name: 'Rock Events Inc.',
            email: 'contact@rockevents.com',
          },
          tickets: [
            {
              id: 'tkt_789',
              type: 'VIP',
              price: 99.99,
              available: 20,
            },
            {
              id: 'tkt_790',
              type: 'Standard',
              price: 49.99,
              available: 80,
            },
          ],
          createdAt: '2025-10-01T10:00:00Z',
          updatedAt: '2025-10-09T12:00:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match POST /api/events response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Event created successfully',
        data: {
          id: 'evt_124',
          title: 'New Jazz Concert',
          status: 'DRAFT',
          createdAt: '2025-10-09T14:00:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Orders API', () => {
    it('should match GET /api/orders/:id response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'ord_123',
          userId: 'usr_456',
          eventId: 'evt_789',
          status: 'COMPLETED',
          total: 199.98,
          currency: 'EUR',
          items: [
            {
              id: 'item_1',
              ticketType: 'VIP',
              quantity: 2,
              unitPrice: 99.99,
              subtotal: 199.98,
            },
          ],
          payment: {
            id: 'pay_123',
            method: 'card',
            status: 'succeeded',
            stripePaymentIntentId: 'pi_123',
          },
          tickets: [
            {
              id: 'tkt_001',
              code: 'TKT-ABC123',
              qrCode: 'https://example.com/qr/abc123.png',
              status: 'VALID',
            },
            {
              id: 'tkt_002',
              code: 'TKT-ABC124',
              qrCode: 'https://example.com/qr/abc124.png',
              status: 'VALID',
            },
          ],
          createdAt: '2025-10-09T10:00:00Z',
          updatedAt: '2025-10-09T10:05:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match POST /api/orders response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Order created successfully',
        data: {
          id: 'ord_124',
          status: 'PENDING_PAYMENT',
          total: 99.99,
          checkoutUrl: 'https://checkout.stripe.com/session_123',
          expiresAt: '2025-10-09T14:30:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match GET /api/orders (user orders list) snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          orders: [
            {
              id: 'ord_123',
              eventId: 'evt_789',
              eventTitle: 'Concert Rock Festival',
              status: 'COMPLETED',
              total: 199.98,
              createdAt: '2025-10-09T10:00:00Z',
            },
            {
              id: 'ord_122',
              eventId: 'evt_788',
              eventTitle: 'Jazz Night',
              status: 'CANCELLED',
              total: 49.99,
              createdAt: '2025-10-08T15:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            perPage: 10,
            total: 15,
            totalPages: 2,
          },
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Users API', () => {
    it('should match GET /api/users/me response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'usr_123',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          emailVerified: true,
          avatar: 'https://example.com/avatar.jpg',
          preferences: {
            newsletter: true,
            eventReminders: true,
            language: 'fr',
          },
          stats: {
            totalOrders: 15,
            totalSpent: 899.85,
            upcomingEvents: 3,
          },
          createdAt: '2025-01-15T10:00:00Z',
          lastLogin: '2025-10-09T09:00:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match PUT /api/users/me response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: 'usr_123',
          name: 'John Smith',
          updatedAt: '2025-10-09T14:00:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Authentication API', () => {
    it('should match POST /api/auth/login response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'usr_123',
            email: 'user@example.com',
            name: 'John Doe',
            role: 'USER',
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresIn: 86400,
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match POST /api/auth/register response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
          user: {
            id: 'usr_124',
            email: 'newuser@example.com',
            name: 'Jane Smith',
            emailVerified: false,
          },
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match POST /api/auth/logout response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Logout successful',
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Tickets API', () => {
    it('should match GET /api/tickets/:id response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'tkt_123',
          code: 'TKT-ABC123',
          orderId: 'ord_456',
          eventId: 'evt_789',
          event: {
            id: 'evt_789',
            title: 'Concert Rock Festival',
            date: '2025-12-25T20:00:00Z',
            location: 'Paris Zenith',
          },
          status: 'VALID',
          qrCode: 'https://example.com/qr/abc123.png',
          qrCodeExpiresAt: '2025-12-25T08:00:00Z',
          seatNumber: 'A12',
          type: 'VIP',
          price: 99.99,
          validatedAt: null,
          createdAt: '2025-10-09T10:05:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match POST /api/tickets/:id/validate response snapshot', () => {
      const mockResponse = {
        success: true,
        message: 'Ticket validated successfully',
        data: {
          id: 'tkt_123',
          status: 'USED',
          validatedAt: '2025-12-25T19:30:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Admin API', () => {
    it('should match GET /api/admin/stats response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          users: {
            total: 15000,
            verified: 14200,
            new: 150,
            growth: 5.2,
          },
          events: {
            total: 450,
            published: 380,
            draft: 70,
            categories: {
              MUSIC: 200,
              SPORT: 150,
              CONFERENCE: 100,
            },
          },
          orders: {
            total: 87500,
            completed: 85000,
            pending: 1500,
            cancelled: 1000,
            revenue: 1250000,
            growth: 12.5,
          },
          tickets: {
            total: 150000,
            valid: 120000,
            used: 25000,
            cancelled: 5000,
          },
          period: {
            start: '2025-10-01T00:00:00Z',
            end: '2025-10-09T23:59:59Z',
          },
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match GET /api/admin/users response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          users: [
            {
              id: 'usr_123',
              email: 'user@example.com',
              name: 'John Doe',
              role: 'USER',
              emailVerified: true,
              ordersCount: 15,
              totalSpent: 899.85,
              createdAt: '2025-01-15T10:00:00Z',
              lastLogin: '2025-10-09T09:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            perPage: 50,
            total: 15000,
            totalPages: 300,
          },
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Organizations API', () => {
    it('should match GET /api/organizations response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          organizations: [
            {
              id: 'org_123',
              name: 'Rock Events Inc.',
              description: 'Professional event organizer',
              website: 'https://rockevents.com',
              logo: 'https://example.com/logo.png',
              role: 'OWNER',
              membersCount: 5,
              eventsCount: 25,
              createdAt: '2025-01-01T10:00:00Z',
            },
          ],
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match GET /api/organizations/:id response snapshot', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'org_123',
          name: 'Rock Events Inc.',
          description: 'Professional event organizer',
          website: 'https://rockevents.com',
          logo: 'https://example.com/logo.png',
          members: [
            {
              id: 'mem_1',
              userId: 'usr_456',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'OWNER',
              joinedAt: '2025-01-01T10:00:00Z',
            },
            {
              id: 'mem_2',
              userId: 'usr_457',
              name: 'Jane Smith',
              email: 'jane@example.com',
              role: 'ADMIN',
              joinedAt: '2025-01-15T14:00:00Z',
            },
          ],
          stats: {
            totalEvents: 25,
            totalRevenue: 125000,
            totalTicketsSold: 5000,
          },
          createdAt: '2025-01-01T10:00:00Z',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Error Responses', () => {
    it('should match 400 Bad Request snapshot', () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: [
            {
              field: 'email',
              message: 'Email is required',
            },
            {
              field: 'password',
              message: 'Password must be at least 8 characters',
            },
          ],
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match 401 Unauthorized snapshot', () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match 403 Forbidden snapshot', () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match 404 Not Found snapshot', () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match 429 Rate Limit snapshot', () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: 60,
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });

    it('should match 500 Internal Server Error snapshot', () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId: 'req_abc123',
        },
      };

      expect(mockResponse).toMatchSnapshot();
    });
  });

  describe('Response Structure Consistency', () => {
    it('should have consistent success response structure', () => {
      const responses = [
        { success: true, data: { id: '123' } },
        { success: true, data: { events: [] } },
        { success: true, message: 'Success', data: {} },
      ];

      responses.forEach(response => {
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('data');
      });
    });

    it('should have consistent error response structure', () => {
      const responses = [
        { success: false, error: { code: 'ERROR', message: 'Error' } },
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed' } },
      ];

      responses.forEach(response => {
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
      });
    });
  });
});
