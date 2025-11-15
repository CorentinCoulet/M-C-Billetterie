/**
 * Test factories for creating test data
 * 
 * These factories help create consistent test data for unit and integration tests.
 * They follow the factory pattern to generate realistic test objects with sensible defaults
 * that can be overridden as needed.
 */

import { addTime } from '@/utils/date';

/**
 * Create a test user
 */
export function createTestUser(overrides = {}) {
  return {
    id: `user-${Math.random().toString(36).substring(2, 9)}`,
    email: `user-${Math.random().toString(36).substring(2, 7)}@example.com`,
    name: 'Test User',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test organizer
 */
export function createTestOrganizer(overrides = {}) {
  return {
    id: `org-${Math.random().toString(36).substring(2, 9)}`,
    name: 'Test Organizer',
    description: 'A test organizer for events',
    email: `organizer-${Math.random().toString(36).substring(2, 7)}@example.com`,
    phone: '+33123456789',
    website: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test category
 */
export function createTestCategory(overrides = {}) {
  const categories = [
    'Musique', 'Technologie', 'Sport', 'Art', 
    'Gastronomie', 'Humour', 'Cinéma', 'Théâtre', 
    'Danse', 'Culture'
  ];
  
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return {
    id: `cat-${Math.random().toString(36).substring(2, 9)}`,
    name: randomCategory,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test venue
 */
export function createTestVenue(overrides = {}) {
  return {
    id: `venue-${Math.random().toString(36).substring(2, 9)}`,
    name: 'Test Venue',
    address: '123 Test Street, Paris, France',
    capacity: 500,
    description: 'A test venue for events',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test event
 */
export function createTestEvent(overrides: any = {}) {
  const organizerId = overrides.organizerId || `org-${Math.random().toString(36).substring(2, 9)}`;
  const categoryId = overrides.categoryId || `cat-${Math.random().toString(36).substring(2, 9)}`;
  const venueId = overrides.venueId || `venue-${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id: `event-${Math.random().toString(36).substring(2, 9)}`,
    title: 'Test Event',
    description: 'A test event for testing purposes',
    date: addTime(new Date(), 7, 'days'),
    location: 'Test Location',
    maxCapacity: 100,
    isPublished: true,
    isCancelled: false,
    organizerId,
    categoryId,
    venueId,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test ticket type
 */
export function createTestTicket(overrides: any = {}) {
  const eventId = overrides.eventId || `event-${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id: `ticket-${Math.random().toString(36).substring(2, 9)}`,
    name: 'Standard Ticket',
    description: 'Standard entry ticket',
    price: 25.0,
    quantity: 100,
    type: 'STANDARD',
    eventId,
    reserved: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test order
 */
export function createTestOrder(overrides: any = {}) {
  const userId = overrides.userId || `user-${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id: `order-${Math.random().toString(36).substring(2, 9)}`,
    userId,
    status: 'COMPLETED',
    totalPrice: 50.0,
    paymentIntentId: `pi_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a test review
 */
export function createTestReview(overrides: any = {}) {
  const userId = overrides.userId || `user-${Math.random().toString(36).substring(2, 9)}`;
  const eventId = overrides.eventId || `event-${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id: `review-${Math.random().toString(36).substring(2, 9)}`,
    userId,
    eventId,
    rating: 4,
    comment: 'Great event, really enjoyed it!',
    createdAt: new Date(),
    ...overrides
  };
}