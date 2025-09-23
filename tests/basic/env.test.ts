describe('Environment Variables Tests', () => {
  beforeEach(() => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have JWT_SECRET defined', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
  });

  it('should have DATABASE_URL defined', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('postgresql://');
  });

  it('should have correct test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
