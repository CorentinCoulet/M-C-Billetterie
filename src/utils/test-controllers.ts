// Import universal adapters
import {
  authControllerAdapters,
  eventControllerAdapters,
  ticketControllerAdapters,
  userControllerAdapters
} from './universal-controllers';

/**
 * Auth Controller avec compatibilité universelle
 */
export const authController = authControllerAdapters;

/**
 * Event Controller avec compatibilité universelle
 */
export const eventController = eventControllerAdapters;

/**
 * Ticket Controller avec compatibilité universelle
 */
export const ticketController = ticketControllerAdapters;

/**
 * User Controller avec compatibilité universelle
 */
export const userController = userControllerAdapters;

export default {
  authController,
  eventController,
  ticketController,
  userController
};