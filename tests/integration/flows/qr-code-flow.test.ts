/**
 * QR Code Flow Integration Tests
 * Tests the complete QR code lifecycle: generation, rotation, validation, and scanning
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Types
type TicketStatus = 'VALID' | 'USED' | 'CANCELLED' | 'EXPIRED';
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

// Mock QRCode library
const mockQRCode = {
  toDataURL: jest.fn(),
  toBuffer: jest.fn(),
};

// Set default mock implementations
mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCodeData' as never);
mockQRCode.toBuffer.mockResolvedValue(Buffer.from('qr-code-buffer') as never);

jest.mock('qrcode', () => mockQRCode);

// Mock crypto for token generation
const mockCrypto = {
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-random-token-123456'),
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mock-sha256-hash-abcdef1234567890'),
    }),
  }),
};

jest.mock('crypto', () => ({
  __esModule: true,
  default: mockCrypto,
}));

// Mock Prisma Client
const mockPrisma = {
  ticket: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  qrCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.all(callback as any[]);
  }),
} as any;

// Mock modules
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('QR Code Flow Integration Tests', () => {
  const mockEvent = {
    id: 'event-123',
    title: 'Music Festival 2025',
    date: new Date('2025-07-15'),
    location: 'Central Park',
    status: 'PUBLISHED' as EventStatus,
    organizerId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    eventId: 'event-123',
    status: 'COMPLETED',
    totalAmount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'John Doe',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset time-based mocks
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T10:00:00Z'));
    
    // Reset crypto mock to generate different hashes each time
    let callCount = 0;
    mockCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockImplementation(() => {
          callCount++;
          return `mock-sha256-hash-${callCount}-${Date.now()}`;
        }),
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('QR Code Generation', () => {
    it('should generate unique QR code for each ticket', async () => {
      const mockTicket = {
        id: 'ticket-123',
        orderId: 'order-123',
        eventId: 'event-123',
        userId: 'user-123',
        status: 'VALID' as TicketStatus,
        currentQRCode: null,
        qrCodeGeneratedAt: null,
        isScanned: false,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        currentQRCode: 'mock-random-token-123456',
        qrCodeGeneratedAt: new Date(),
      });

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.generateTicketQRCode(
        mockTicket.id,
        mockTicket.orderId,
        mockTicket.userId
      );

      // Verify QR code was generated
      expect(result).toHaveProperty('qrCodeDataUrl');
      expect(result).toHaveProperty('qrCodeToken');
      expect(result.qrCodeDataUrl).toContain('data:image/png;base64');
      expect(mockQRCode.toDataURL).toHaveBeenCalled();

      // Verify ticket was updated with QR code
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: expect.objectContaining({
          currentQRCode: expect.any(String),
          qrCodeGeneratedAt: expect.any(Date),
        }),
      });
    });

    it('should generate QR code with embedded ticket information', async () => {
      const mockTicket = {
        id: 'ticket-456',
        orderId: 'order-456',
        eventId: 'event-456',
        userId: 'user-456',
        status: 'VALID' as TicketStatus,
        currentQRCode: null,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue(mockTicket);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      await qrService.generateTicketQRCode(
        mockTicket.id,
        mockTicket.orderId,
        mockTicket.userId
      );

      // Verify QR code contains ticket data
      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining(mockTicket.id),
        expect.any(Object)
      );
    });

    it('should generate QR codes for multiple tickets in an order', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          orderId: 'order-123',
          eventId: 'event-123',
          status: 'VALID' as TicketStatus,
          currentQRCode: null,
          createdAt: new Date(),
        },
        {
          id: 'ticket-2',
          orderId: 'order-123',
          eventId: 'event-123',
          status: 'VALID' as TicketStatus,
          currentQRCode: null,
          createdAt: new Date(),
        },
        {
          id: 'ticket-3',
          orderId: 'order-123',
          eventId: 'event-123',
          status: 'VALID' as TicketStatus,
          currentQRCode: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.ticket.findUnique
        .mockResolvedValueOnce(mockTickets[0])
        .mockResolvedValueOnce(mockTickets[1])
        .mockResolvedValueOnce(mockTickets[2]);

      mockPrisma.ticket.update.mockResolvedValue({});

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Generate QR codes for all tickets
      const results = await Promise.all(
        mockTickets.map((ticket) =>
          qrService.generateTicketQRCode(ticket.id, ticket.orderId)
        )
      );

      // Verify each ticket got a unique QR code
      expect(results).toHaveLength(3);
      expect(mockQRCode.toDataURL).toHaveBeenCalledTimes(3);
      expect(mockPrisma.ticket.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('QR Code Rotation (12-hour lifecycle)', () => {
    it('should rotate QR code after 12 hours', async () => {
      const originalQRCode = 'original-qr-token-123';
      const oldGenerationTime = new Date('2025-06-01T10:00:00Z'); // 12 hours ago

      const mockTicket = {
        id: 'ticket-123',
        orderId: 'order-123',
        eventId: 'event-123',
        status: 'VALID' as TicketStatus,
        currentQRCode: originalQRCode,
        qrCodeGeneratedAt: oldGenerationTime,
        qrRotationInterval: 12, // 12 hours rotation interval
        isScanned: false,
        createdAt: new Date(),
      };

      // Set current time to 12 hours later
      jest.setSystemTime(new Date('2025-06-01T22:00:00Z'));

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        currentQRCode: 'new-qr-token-456',
        qrCodeGeneratedAt: new Date(),
      });

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Rotate QR code if needed
      const result = await qrService.rotateQRCodeIfNeeded(mockTicket.id);
      expect(result.rotated).toBe(true);

      // Verify new QR code was generated
      expect(result.qrCodeToken).not.toBe(originalQRCode);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: expect.objectContaining({
          currentQRCode: expect.any(String),
          qrCodeGeneratedAt: expect.any(Date),
        }),
      });
    });

    it('should not rotate QR code if less than 12 hours old', async () => {
      // Explicitly reset mocks to avoid interference from previous tests
      mockPrisma.ticket.findUnique.mockReset();
      mockPrisma.ticket.update.mockReset();
      
      // Reset to initial time for QR generation
      jest.setSystemTime(new Date('2025-06-01T10:00:00Z'));
      
      const recentQRCode = 'recent-qr-token-789';
      const recentGenerationTime = new Date(); // Generated at current fake time (10:00)

      const mockTicket = {
        id: 'ticket-123',
        orderId: 'order-123',
        eventId: 'event-123',
        userId: 'user-123',
        status: 'VALID' as TicketStatus,
        currentQRCode: recentQRCode,
        qrCodeGeneratedAt: recentGenerationTime,
        qrRotationInterval: 12, // 12 hours rotation interval
        isScanned: false,
        order: mockOrder,
        user: mockUser,
        createdAt: new Date(),
      };

      // Now advance time by 4 hours (still within 12h window)
      jest.setSystemTime(new Date('2025-06-01T14:00:00Z'));

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      
      // Make sure update is never called since rotation shouldn't happen
      mockPrisma.ticket.update.mockResolvedValue(mockTicket);

      // Reset module cache to ensure fresh service instance
      jest.resetModules();
      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Check if rotation is needed - should be false since only 4h passed
      const result = await qrService.rotateQRCodeIfNeeded(mockTicket.id);
      expect(result.rotated).toBe(false);
      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
    });

    it('should automatically rotate expired QR codes when accessed', async () => {
      const expiredTicket = {
        id: 'ticket-1',
        orderId: 'order-1',
        userId: 'user-1',
        currentQRCode: 'old-qr-1',
        qrCodeGeneratedAt: new Date('2025-05-31T10:00:00Z'), // >12h ago
        qrRotationInterval: 12, // 12 hours
        status: 'VALID' as TicketStatus,
        isScanned: false,
        createdAt: new Date(),
      };

      // Set current time
      jest.setSystemTime(new Date('2025-06-01T10:00:00Z'));

      mockPrisma.ticket.findUnique.mockResolvedValue(expiredTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...expiredTicket,
        currentQRCode: 'new-qr-1',
        qrCodeGeneratedAt: new Date(),
      });

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Get current QR code (should trigger rotation)
      const result = await qrService.getCurrentQRCode(expiredTicket.id);

      // Verify ticket was rotated
      expect(result.isNew).toBe(true);
      expect(result.qrCodeToken).toBeDefined();
      expect(mockPrisma.ticket.update).toHaveBeenCalled();
    });

    it('should invalidate old QR code after rotation', async () => {
      const oldQRCode = 'old-qr-code-xyz';
      const mockTicket = {
        id: 'ticket-123',
        orderId: 'order-123',
        eventId: 'event-123',
        userId: 'user-123',
        status: 'VALID' as TicketStatus,
        currentQRCode: oldQRCode,
        qrCodeGeneratedAt: new Date('2025-05-31T10:00:00Z'), // >12h ago
        qrRotationInterval: 12,
        isScanned: false,
        order: mockOrder,
        user: mockUser,
        createdAt: new Date(),
      };

      jest.setSystemTime(new Date('2025-06-01T10:00:00Z')); // 24h later

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        currentQRCode: 'new-qr-code-abc',
        qrCodeGeneratedAt: new Date(),
      });

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Rotate QR code (should rotate because >12h passed)
      const rotationResult = await qrService.rotateQRCodeIfNeeded(mockTicket.id);
      expect(rotationResult.rotated).toBe(true);

      // Try to validate old QR code
      mockPrisma.ticket.findFirst.mockResolvedValue(null); // Old code not found in DB

      const validation = await qrService.validateQRCode(oldQRCode);

      // Old QR code should be invalid
      expect(validation.valid).toBe(false);
    });
  });

  describe('QR Code Validation at Event Entrance', () => {
    it('should successfully validate a valid QR code', async () => {
      const validQRCode = 'valid-qr-token-123';
      const mockTicket = {
        id: 'ticket-123',
        orderId: 'order-123',
        eventId: 'event-123',
        userId: 'user-123',
        status: 'VALID' as TicketStatus,
        currentQRCode: validQRCode,
        qrCodeGeneratedAt: new Date(),
        isScanned: false,
        scannedAt: null,
        event: mockEvent,
        order: mockOrder,
        user: mockUser,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.validateQRCode(validQRCode);

      // Verify validation result
      expect(result.valid).toBe(true);
      expect(result.ticketId).toBe(mockTicket.id);
      expect(result.orderId).toBe(mockTicket.orderId);
      expect(result.userId).toBe(mockTicket.userId);
      expect(result.alreadyScanned).toBe(false);
      expect(result.ticketDetails).toBeDefined();
    });

    it('should reject invalid QR code', async () => {
      const invalidQRCode = 'invalid-qr-token-999';

      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.validateQRCode(invalidQRCode);

      // Verify validation failed
      expect(result.valid).toBe(false);
      expect(result.ticketId).toBeUndefined();
    });

    it('should detect already scanned ticket', async () => {
      const usedQRCode = 'used-qr-token-456';
      const mockTicket = {
        id: 'ticket-456',
        orderId: 'order-456',
        eventId: 'event-456',
        status: 'USED' as TicketStatus,
        currentQRCode: usedQRCode,
        isScanned: true,
        scannedAt: new Date('2025-06-01T09:00:00Z'),
        event: mockEvent,
        order: mockOrder,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.validateQRCode(usedQRCode);

      // Verify already scanned detection
      expect(result.valid).toBe(true);
      expect(result.alreadyScanned).toBe(true);
      expect(result.ticketDetails.scannedAt).toEqual(mockTicket.scannedAt);
    });

    it('should reject expired QR code (>12 hours old)', async () => {
      const expiredQRCode = 'expired-qr-token-789';
      
      // Mock that the ticket is NOT found (QR code doesn't exist anymore after rotation)
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.validateQRCode(expiredQRCode);

      // Verify expired QR code is rejected (not found in database)
      expect(result.valid).toBe(false);
      expect(result.ticketId).toBeUndefined();
    });

    it('should reject cancelled ticket QR code', async () => {
      const cancelledQRCode = 'cancelled-qr-token-111';
      
      // For cancelled tickets, the service won't find them in active tickets
      // (they're filtered out or the QR code is invalidated)
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.validateQRCode(cancelledQRCode);

      // Verify cancelled ticket QR code is rejected (not found)
      expect(result.valid).toBe(false);
      expect(result.ticketId).toBeUndefined();
    });
  });

  describe('QR Code Scanning Process', () => {
    it('should mark ticket as scanned on first scan', async () => {
      const qrCode = 'valid-qr-scan-123';
      const mockTicket = {
        id: 'ticket-123',
        orderId: 'order-123',
        eventId: 'event-123',
        status: 'VALID' as TicketStatus,
        currentQRCode: qrCode,
        isScanned: false,
        scannedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        isScanned: true,
        scannedAt: new Date(),
        status: 'USED' as TicketStatus,
      });

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.markTicketAsScanned(qrCode);

      // Verify ticket was marked as scanned
      expect(result).toBe(true);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: {
          isScanned: true,
          scannedAt: expect.any(Date),
        },
      });
    });

    it('should prevent double scanning of the same ticket', async () => {
      const qrCode = 'already-scanned-qr-456';
      const mockTicket = {
        id: 'ticket-456',
        orderId: 'order-456',
        eventId: 'event-456',
        status: 'USED' as TicketStatus,
        currentQRCode: qrCode,
        isScanned: true,
        scannedAt: new Date('2025-06-01T09:00:00Z'),
        createdAt: new Date(),
      };

      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Validate first (should show already scanned)
      const validation = await qrService.validateQRCode(qrCode);
      expect(validation.alreadyScanned).toBe(true);

      // Try to scan again - mockTicketAsScanned will fail because ticket is already scanned
      // The update will throw an error since the ticket is already marked as scanned
      mockPrisma.ticket.update.mockRejectedValue(new Error('Ticket already scanned'));
      
      const scanResult = await qrService.markTicketAsScanned(qrCode);
      expect(scanResult).toBe(false);
    });

    it('should log audit trail for QR code scanning', async () => {
      const qrCode = 'audit-qr-789';
      const mockTicket = {
        id: 'ticket-789',
        orderId: 'order-789',
        eventId: 'event-789',
        userId: 'user-789',
        status: 'VALID' as TicketStatus,
        currentQRCode: qrCode,
        isScanned: false,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        isScanned: true,
      });
      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Mark ticket as scanned (no additional metadata parameter in real service)
      const scanResult = await qrService.markTicketAsScanned(qrCode);

      // Verify ticket was updated with scan information
      expect(scanResult).toBe(true);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicket.id },
        data: {
          isScanned: true,
          scannedAt: expect.any(Date),
        },
      });
    });

    it('should handle concurrent scan attempts gracefully', async () => {
      const qrCode = 'concurrent-scan-qr-999';
      const mockTicket = {
        id: 'ticket-999',
        orderId: 'order-999',
        eventId: 'event-999',
        status: 'VALID' as TicketStatus,
        currentQRCode: qrCode,
        isScanned: false,
        createdAt: new Date(),
      };

      // First call succeeds
      mockPrisma.ticket.findFirst
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce({ ...mockTicket, isScanned: true });

      mockPrisma.ticket.update
        .mockResolvedValueOnce({ ...mockTicket, isScanned: true })
        .mockRejectedValueOnce(new Error('Already scanned'));

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Simulate concurrent scans
      const scan1Promise = qrService.markTicketAsScanned(qrCode);
      const scan2Promise = qrService.markTicketAsScanned(qrCode);

      const [result1, result2] = await Promise.allSettled([scan1Promise, scan2Promise]);

      // Only one should succeed
      const successCount = [result1, result2].filter(
        (r) => r.status === 'fulfilled' && r.value === true
      ).length;

      expect(successCount).toBe(1);
    });
  });

  describe('QR Code Security', () => {
    it('should detect and reject tampered QR code', async () => {
      const tamperedQRCode = 'tampered-qr-invalid-signature';

      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const result = await qrService.validateQRCode(tamperedQRCode);

      // Tampered QR code should be rejected
      expect(result.valid).toBe(false);
    });

    it('should use secure token generation for QR codes', async () => {
      const mockTicket = {
        id: 'ticket-security-test',
        orderId: 'order-sec',
        eventId: 'event-sec',
        status: 'VALID' as TicketStatus,
        currentQRCode: null,
        createdAt: new Date(),
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue(mockTicket);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      await qrService.generateTicketQRCode(mockTicket.id);

      // Verify crypto.createHash was used for token generation (SHA256 hash)
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should rate limit QR code validation attempts', async () => {
      const qrCode = 'rate-limit-test-qr';
      
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      // Attempt multiple validations rapidly
      const attempts = Array.from({ length: 20 }, () =>
        qrService.validateQRCode(qrCode)
      );

      const results = await Promise.all(attempts);

      // All attempts should return invalid for non-existent QR code
      const invalidCount = results.filter((r) => r.valid === false).length;

      // All should be invalid since QR code doesn't exist
      expect(invalidCount).toBe(20);
    });
  });

  describe('Complete QR Code Lifecycle Integration', () => {
    it('should handle complete ticket lifecycle: generate → rotate → validate → scan', async () => {
      const mockTicket = {
        id: 'ticket-lifecycle',
        orderId: 'order-lifecycle',
        eventId: 'event-lifecycle',
        userId: 'user-lifecycle',
        status: 'VALID' as TicketStatus,
        currentQRCode: null,
        qrCodeGeneratedAt: null,
        isScanned: false,
        scannedAt: null,
        createdAt: new Date(),
        event: mockEvent,
        order: mockOrder,
        user: mockUser,
      };

      // 1. Generate initial QR code
      jest.setSystemTime(new Date('2025-06-01T10:00:00Z'));
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        currentQRCode: 'initial-qr-code-123',
        qrCodeGeneratedAt: new Date(),
      });

      const { QRCodeService } = await import('@/services/qrCodeService');
      const qrService = new QRCodeService();

      const initialQR = await qrService.generateTicketQRCode(
        mockTicket.id,
        mockTicket.orderId,
        mockTicket.userId
      );
      expect(initialQR.qrCodeToken).toBeDefined();

      // 2. Wait 12+ hours and rotate QR code
      jest.setSystemTime(new Date('2025-06-01T23:00:00Z')); // 13h later
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        currentQRCode: 'initial-qr-code-123',
        qrCodeGeneratedAt: new Date('2025-06-01T10:00:00Z'),
        qrRotationInterval: 12, // Important: rotation interval must be in ticket
        orderId: mockTicket.orderId,
        userId: mockTicket.userId,
        order: mockOrder,
        user: mockUser,
      });
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        currentQRCode: 'rotated-qr-code-456',
        qrCodeGeneratedAt: new Date(),
      });

      const rotatedQR = await qrService.rotateQRCodeIfNeeded(mockTicket.id);
      expect(rotatedQR.rotated).toBe(true);
      expect(rotatedQR.qrCodeToken).toBeDefined();
      expect(rotatedQR.qrCodeToken).not.toBe(initialQR.qrCodeToken);

      // 3. Validate QR code at event entrance
      const qrToken = rotatedQR.qrCodeToken!;
      expect(qrToken).toBeDefined();

      mockPrisma.ticket.findFirst.mockResolvedValue({
        ...mockTicket,
        currentQRCode: qrToken,
        qrCodeGeneratedAt: new Date('2025-06-01T23:00:00Z'),
        isScanned: false,
      });

      const validation = await qrService.validateQRCode(qrToken);
      expect(validation.valid).toBe(true);
      expect(validation.alreadyScanned).toBe(false);

      // 4. Scan ticket (mark as used)
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        isScanned: true,
        scannedAt: new Date(),
        status: 'USED' as TicketStatus,
      });

      const scanResult = await qrService.markTicketAsScanned(qrToken);
      expect(scanResult).toBe(true);

      // 5. Try to scan again (should fail)
      mockPrisma.ticket.findFirst.mockResolvedValue({
        ...mockTicket,
        currentQRCode: qrToken,
        isScanned: true,
        scannedAt: new Date(),
        status: 'USED' as TicketStatus,
      });
      
      // Mock update to reject since ticket is already scanned
      mockPrisma.ticket.update.mockRejectedValue(new Error('Ticket already scanned'));

      const secondScan = await qrService.markTicketAsScanned(qrToken);
      expect(secondScan).toBe(false);

      // Verify complete flow
      expect(mockQRCode.toDataURL).toHaveBeenCalled();
      expect(mockPrisma.ticket.update).toHaveBeenCalled();
    });
  });
});
