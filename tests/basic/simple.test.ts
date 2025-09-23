describe('Basic Test', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
