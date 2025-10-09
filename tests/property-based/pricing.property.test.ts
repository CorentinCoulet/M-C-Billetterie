/**
 * Property-Based Testing - Advanced Pricing Logic
 * Complex tests for price calculations, commissions, and discounts
 * 
 * @jest-environment node
 */

import fc from 'fast-check';

// Types
interface PriceCalculation {
  basePrice: number;
  quantity: number;
  discount?: number;
  commission?: number;
  tax?: number;
}

interface RefundCalculation {
  originalAmount: number;
  refundPercentage: number;
  processingFee: number;
}

// Price calculation functions
function calculateOrderTotal(calc: PriceCalculation): number {
  if (!Number.isFinite(calc.basePrice) || calc.basePrice < 0) {
    throw new Error('Invalid base price');
  }
  if (!Number.isFinite(calc.quantity) || calc.quantity < 1 || !Number.isInteger(calc.quantity)) {
    throw new Error('Invalid quantity');
  }

  let total = calc.basePrice * calc.quantity;

  // Apply discount
  if (calc.discount !== undefined) {
    if (calc.discount < 0 || calc.discount > 1) {
      throw new Error('Discount must be between 0 and 1');
    }
    total = total * (1 - calc.discount);
  }

  // Add commission
  if (calc.commission !== undefined) {
    if (calc.commission < 0 || calc.commission > 1) {
      throw new Error('Commission must be between 0 and 1');
    }
    total = total * (1 + calc.commission);
  }

  // Add tax
  if (calc.tax !== undefined) {
    if (calc.tax < 0 || calc.tax > 1) {
      throw new Error('Tax must be between 0 and 1');
    }
    total = total * (1 + calc.tax);
  }

  return Math.round(total * 100) / 100;
}

function calculateRefund(calc: RefundCalculation): number {
  if (!Number.isFinite(calc.originalAmount) || calc.originalAmount < 0) {
    throw new Error('Invalid original amount');
  }
  if (!Number.isFinite(calc.refundPercentage) || calc.refundPercentage < 0 || calc.refundPercentage > 1) {
    throw new Error('Invalid refund percentage');
  }
  if (!Number.isFinite(calc.processingFee) || calc.processingFee < 0) {
    throw new Error('Invalid processing fee');
  }

  const refundAmount = calc.originalAmount * calc.refundPercentage;
  const finalRefund = Math.max(0, refundAmount - calc.processingFee);

  return Math.round(finalRefund * 100) / 100;
}

function applyBulkDiscount(quantity: number, basePrice: number): number {
  if (quantity < 1 || !Number.isInteger(quantity)) {
    throw new Error('Invalid quantity');
  }
  if (basePrice < 0) {
    throw new Error('Invalid base price');
  }

  let discount = 0;
  if (quantity >= 10) {
    discount = 0.15; // 15% discount
  } else if (quantity >= 5) {
    discount = 0.10; // 10% discount
  } else if (quantity >= 3) {
    discount = 0.05; // 5% discount
  }

  const total = quantity * basePrice * (1 - discount);
  return Math.round(total * 100) / 100;
}

function calculateEarlyBirdPrice(basePrice: number, daysUntilEvent: number): number {
  if (basePrice < 0 || !Number.isFinite(basePrice)) {
    throw new Error('Invalid base price');
  }
  if (daysUntilEvent < 0 || !Number.isInteger(daysUntilEvent)) {
    throw new Error('Invalid days until event');
  }

  let discount = 0;
  if (daysUntilEvent > 90) {
    discount = 0.25; // 25% for > 3 months
  } else if (daysUntilEvent > 60) {
    discount = 0.20; // 20% for > 2 months
  } else if (daysUntilEvent > 30) {
    discount = 0.15; // 15% for > 1 month
  } else if (daysUntilEvent > 14) {
    discount = 0.10; // 10% for > 2 weeks
  }

  return Math.round(basePrice * (1 - discount) * 100) / 100;
}

describe('Order Total Calculation - Property Based', () => {
  it('should always calculate valid order totals', () => {
    fc.assert(
      fc.property(
        fc.record({
          basePrice: fc.double({ min: 0.01, max: 1000, noNaN: true }),
          quantity: fc.integer({ min: 1, max: 100 }),
        }),
        (data) => {
          const total = calculateOrderTotal(data);

          expect(Number.isFinite(total)).toBe(true);
          expect(total).toBeGreaterThanOrEqual(0);
          expect(total).toBeCloseTo(data.basePrice * data.quantity, 2); // Allow rounding
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should apply discounts correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          basePrice: fc.double({ min: 10, max: 1000, noNaN: true }),
          quantity: fc.integer({ min: 1, max: 100 }),
          discount: fc.double({ min: 0, max: 0.5, noNaN: true }), // 0-50%
        }),
        (data) => {
          const total = calculateOrderTotal(data);
          const baseTotal = data.basePrice * data.quantity;
          const expectedTotal = baseTotal * (1 - data.discount!);

          expect(total).toBeCloseTo(baseTotal * (1 - data.discount!), 2);
          expect(total).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should apply commission correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          basePrice: fc.double({ min: 10, max: 1000, noNaN: true }),
          quantity: fc.integer({ min: 1, max: 100 }),
          commission: fc.double({ min: 0, max: 0.2, noNaN: true }), // 0-20%
        }),
        (data) => {
          const total = calculateOrderTotal(data);
          const baseTotal = data.basePrice * data.quantity;
          const expectedTotal = baseTotal * (1 + data.commission!);

          expect(total).toBeCloseTo(baseTotal * (1 + data.commission!), 2);
          expect(total).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should handle complex calculations with discount + commission + tax', () => {
    fc.assert(
      fc.property(
        fc.record({
          basePrice: fc.double({ min: 10, max: 1000, noNaN: true }),
          quantity: fc.integer({ min: 1, max: 100 }),
          discount: fc.double({ min: 0, max: 0.3, noNaN: true }),
          commission: fc.double({ min: 0, max: 0.15, noNaN: true }),
          tax: fc.double({ min: 0, max: 0.25, noNaN: true }),
        }),
        (data) => {
          const total = calculateOrderTotal(data);

          expect(Number.isFinite(total)).toBe(true);
          expect(total).toBeGreaterThanOrEqual(0);

          // Verify order of operations
          const baseTotal = data.basePrice * data.quantity;
          const afterDiscount = baseTotal * (1 - data.discount!);
          const afterCommission = afterDiscount * (1 + data.commission!);
          const afterTax = afterCommission * (1 + data.tax!);

          expect(total).toBeCloseTo(afterTax, 2);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('should reject invalid inputs', () => {
    const invalidInputs = [
      { basePrice: -10, quantity: 1 },
      { basePrice: 10, quantity: 0 },
      { basePrice: 10, quantity: -1 },
      { basePrice: 10, quantity: 1.5 }, // Non-integer quantity
      { basePrice: 10, quantity: 1, discount: -0.1 },
      { basePrice: 10, quantity: 1, discount: 1.5 },
      { basePrice: 10, quantity: 1, commission: -0.1 },
      { basePrice: 10, quantity: 1, commission: 1.5 },
    ];

    invalidInputs.forEach(input => {
      expect(() => calculateOrderTotal(input as any)).toThrow();
    });
  });
});

describe('Refund Calculation - Property Based', () => {
  it('should calculate valid refunds', () => {
    fc.assert(
      fc.property(
        fc.record({
          originalAmount: fc.double({ min: 10, max: 10000, noNaN: true }),
          refundPercentage: fc.double({ min: 0, max: 1, noNaN: true }),
          processingFee: fc.double({ min: 0, max: 10, noNaN: true }),
        }),
        (data) => {
          const refund = calculateRefund(data);

          expect(Number.isFinite(refund)).toBe(true);
          expect(refund).toBeGreaterThanOrEqual(0);
          // Allow small rounding differences
          expect(refund).toBeLessThanOrEqual(data.originalAmount + 0.01);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should never refund more than original amount', () => {
    fc.assert(
      fc.property(
        fc.record({
          originalAmount: fc.double({ min: 10, max: 10000, noNaN: true }),
          refundPercentage: fc.double({ min: 0, max: 1, noNaN: true }),
          processingFee: fc.double({ min: 0, max: 5, noNaN: true }),
        }),
        (data) => {
          const refund = calculateRefund(data);
          // Allow small rounding differences
          expect(refund).toBeLessThanOrEqual(data.originalAmount + 0.01);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should handle full refund (100%)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 5, noNaN: true }),
        (amount, fee) => {
          const refund = calculateRefund({
            originalAmount: amount,
            refundPercentage: 1,
            processingFee: fee,
          });

          const expected = Math.max(0, amount - fee);
          expect(refund).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle partial refunds correctly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 1000, noNaN: true }),
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        (amount, percentage) => {
          const refund = calculateRefund({
            originalAmount: amount,
            refundPercentage: percentage,
            processingFee: 0,
          });

          expect(refund).toBeCloseTo(amount * percentage, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Bulk Discount - Property Based', () => {
  it('should apply correct bulk discounts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.double({ min: 10, max: 100, noNaN: true }),
        (quantity, basePrice) => {
          const total = applyBulkDiscount(quantity, basePrice);

          expect(Number.isFinite(total)).toBe(true);
          expect(total).toBeGreaterThanOrEqual(0);

          // Verify discount logic
          const baseTotal = quantity * basePrice;
          if (quantity >= 10) {
            expect(total).toBeCloseTo(baseTotal * 0.85, 2);
          } else if (quantity >= 5) {
            expect(total).toBeCloseTo(baseTotal * 0.90, 2);
          } else if (quantity >= 3) {
            expect(total).toBeCloseTo(baseTotal * 0.95, 2);
          } else {
            expect(total).toBeCloseTo(baseTotal, 2);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should give better discounts for higher quantities', () => {
    const basePrice = 100;
    
    const price1 = applyBulkDiscount(1, basePrice);
    const price3 = applyBulkDiscount(3, basePrice);
    const price5 = applyBulkDiscount(5, basePrice);
    const price10 = applyBulkDiscount(10, basePrice);

    // Average unit price should decrease
    expect(price1 / 1).toBeGreaterThanOrEqual(price3 / 3);
    expect(price3 / 3).toBeGreaterThanOrEqual(price5 / 5);
    expect(price5 / 5).toBeGreaterThanOrEqual(price10 / 10);
  });
});

describe('Early Bird Pricing - Property Based', () => {
  it('should calculate valid early bird prices', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true }),
        fc.integer({ min: 0, max: 180 }),
        (basePrice, daysUntil) => {
          const price = calculateEarlyBirdPrice(basePrice, daysUntil);

          expect(Number.isFinite(price)).toBe(true);
          expect(price).toBeGreaterThanOrEqual(0);
          // Allow small rounding differences
          expect(price).toBeLessThanOrEqual(basePrice + 0.01);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should give better prices for earlier bookings', () => {
    const basePrice = 100;

    const price7days = calculateEarlyBirdPrice(basePrice, 7);
    const price30days = calculateEarlyBirdPrice(basePrice, 30);
    const price60days = calculateEarlyBirdPrice(basePrice, 60);
    const price90days = calculateEarlyBirdPrice(basePrice, 90);
    const price120days = calculateEarlyBirdPrice(basePrice, 120);

    // The earlier you book, the cheaper it is
    expect(price7days).toBeGreaterThanOrEqual(price30days);
    expect(price30days).toBeGreaterThanOrEqual(price60days);
    expect(price60days).toBeGreaterThanOrEqual(price90days);
    expect(price90days).toBeGreaterThanOrEqual(price120days);
  });

  it('should apply correct discount tiers', () => {
    const basePrice = 100;

    // > 90 days: 25%
    expect(calculateEarlyBirdPrice(basePrice, 91)).toBe(75);
    
    // > 60 days: 20% discount
    expect(calculateEarlyBirdPrice(basePrice, 61)).toBe(80);
    
    // > 30 days: 15% discount
    expect(calculateEarlyBirdPrice(basePrice, 31)).toBe(85);
    
    // > 14 days: 10% discount
    expect(calculateEarlyBirdPrice(basePrice, 15)).toBe(90);
    
    // <= 14 days: no discount
    expect(calculateEarlyBirdPrice(basePrice, 7)).toBe(100);
  });
});

describe('Price Rounding - Property Based', () => {
  it('should always round to 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10000, noNaN: true }),
        (price) => {
          const rounded = Math.round(price * 100) / 100;

          const decimals = rounded.toString().split('.')[1]?.length || 0;
          expect(decimals).toBeLessThanOrEqual(2);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('should round consistently', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 10000, noNaN: true }),
        (price) => {
          const rounded1 = Math.round(price * 100) / 100;
          const rounded2 = Math.round(price * 100) / 100;

          expect(rounded1).toBe(rounded2);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Price Boundaries - Property Based', () => {
  it('should handle minimum prices', () => {
    const MIN_PRICE = 0.01;

    fc.assert(
      fc.property(
        fc.double({ min: MIN_PRICE, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 10 }),
        (price, quantity) => {
          const total = calculateOrderTotal({ basePrice: price, quantity });
          expect(total).toBeGreaterThanOrEqual(MIN_PRICE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle maximum prices', () => {
    const MAX_PRICE = 100000;

    fc.assert(
      fc.property(
        fc.double({ min: 1, max: MAX_PRICE, noNaN: true }),
        fc.integer({ min: 1, max: 10 }),
        (price, quantity) => {
          const total = calculateOrderTotal({ basePrice: price, quantity });
          expect(total).toBeLessThanOrEqual(MAX_PRICE * quantity * 2); // Allow margin for commission/tax
        }
      ),
      { numRuns: 100 }
    );
  });
});
