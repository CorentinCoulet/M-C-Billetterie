// Flexible types for adapters - compatible with test mocks
interface FlexibleRequest {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
  user?: { id: string; [key: string]: any };
  method?: string;
  url?: string;
  [key: string]: any;
}

interface FlexibleResponse {
  status(code: number): FlexibleResponse;
  json(data: any): FlexibleResponse;
  send?(data: any): FlexibleResponse;
  cookie?(name: string, value: string, options?: any): FlexibleResponse;
  redirect?(url: string): FlexibleResponse;
}

/**
 * Auth Controller Adapters
 */
export const authControllerAdapters = {
  register: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      // Placeholder - tests can mock this function
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
    }
  },

  login: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ token: 'mock-jwt-token', user: { id: 'test-user' } });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Login failed' });
    }
  },

  logout: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Logout failed' });
    }
  },

  getCurrentUser: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      const userId = req.user?.id || 'test-user';
      res.status(200).json({ id: userId, email: 'test@example.com', name: 'Test User' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get user' });
    }
  },

  changePassword: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Password change failed' });
    }
  }
};

/**
 * Event Controller Adapters  
 */
export const eventControllerAdapters = {
  list: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json([]);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list events' });
    }
  },

  create: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(201).json({ id: 'test-event', ...req.body });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create event' });
    }
  },

  getById: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      const eventId = (req.query.id as string) || req.params?.id || 'test-event';
      res.status(200).json({ id: eventId, title: 'Test Event' });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Event not found' });
    }
  },

  deleteById: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete event' });
    }
  },

  getEventTickets: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json([]);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get event tickets' });
    }
  },

  getEventStats: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ totalTickets: 0, soldTickets: 0, revenue: 0 });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get event stats' });
    }
  },

  validateTicket: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ valid: true, message: 'Ticket validated' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to validate ticket' });
    }
  },

  getPublicEvents: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json([]);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get public events' });
    }
  },

  getFeaturedEvents: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json([]);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get featured events' });
    }
  }
};

/**
 * Ticket Controller Adapters
 */
export const ticketControllerAdapters = {
  list: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json([]);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list tickets' });
    }
  },

  create: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(201).json({ id: 'test-ticket', ...req.body });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create ticket' });
    }
  },

  getById: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      const ticketId = (req.query.id as string) || req.params?.id || 'test-ticket';
      res.status(200).json({ id: ticketId, code: 'TEST123' });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Ticket not found' });
    }
  },

  reserve: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'Ticket reserved successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to reserve ticket' });
    }
  },

  validate: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ valid: true, message: 'Ticket validated' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to validate ticket' });
    }
  },

  cancel: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'Ticket cancelled successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to cancel ticket' });
    }
  },

  download: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      const ticketId = (req.query.id as string) || req.params?.id || 'test-ticket';
      res.status(200).json({ id: ticketId, downloadUrl: 'mock-url' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to download ticket' });
    }
  }
};

/**
 * User Controller Adapters
 */
export const userControllerAdapters = {
  list: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json([]);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list users' });
    }
  },

  getById: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      const userId = (req.query.id as string) || req.params?.id || req.user?.id || 'test-user';
      res.status(200).json({ id: userId, email: 'test@example.com', name: 'Test User' });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'User not found' });
    }
  },

  updateById: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update user' });
    }
  },

  deleteById: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete user' });
    }
  },

  getProfile: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      const userId = req.user?.id || 'test-user';
      res.status(200).json({ id: userId, email: 'test@example.com', name: 'Test User' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get profile' });
    }
  },

  updateProfile: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update profile' });
    }
  },

  getStats: async (req: FlexibleRequest, res: FlexibleResponse) => {
    try {
      res.status(200).json({ totalOrders: 0, totalTickets: 0, totalSpent: 0 });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to get stats' });
    }
  }
};

export default {
  auth: authControllerAdapters,
  event: eventControllerAdapters,
  ticket: ticketControllerAdapters,
  user: userControllerAdapters
};
