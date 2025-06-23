/**
 * Configuration index file
 * Exports all configuration modules
 */

// Import all configuration modules
import appConfig from './app';
import authConfig from './auth';
import databaseConfig from './database';
import emailConfig from './email';
import stripeConfig from './stripe';
import uploadConfig from './upload';

// Export individual configurations
export const app = appConfig;
export const auth = authConfig;
export const database = databaseConfig;
export const email = emailConfig;
export const stripe = stripeConfig;
export const upload = uploadConfig;

// Export all configurations as a single object
export default {
  app,
  auth,
  database,
  email,
  stripe,
  upload,
};