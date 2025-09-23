import { mockPrisma } from '../mocks/prisma.mock';

describe('Mock System Test', () => {
  it('should have working mock functions', () => {
    expect(typeof mockPrisma.user.findMany).toBe('function');
    expect(typeof mockPrisma.event.create).toBe('function');
    expect(typeof mockPrisma.$transaction).toBe('function');
  });

  it('should return mock data', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 1, email: 'test@example.com', name: 'Test User', role: 'USER' }
    ]);

    const users = await mockPrisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('test@example.com');
  });
});
