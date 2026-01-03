
// Import of the original service
import authServiceInstance from '../../services/authService';

// Re-export types
export * from '../../services/authService';
export { default } from '../../services/authService';

// Export individual methods used in API routes
export const login = (
  email: string, 
  password: string,
  metadata?: { ipAddress?: string; userAgent?: string }
) => authServiceInstance.login(email, password, metadata);
export const register = (
  email: string, 
  password: string, 
  name?: string, 
  consentsMetadata?: {
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
    ageVerifiedAt?: string;
    marketingConsent?: boolean;
    registrationIp?: string;
    registrationUserAgent?: string;
  }
) => authServiceInstance.register(email, password, name, consentsMetadata);
export const logout = (sessionId: string) => authServiceInstance.logout(sessionId);
export const validateToken = (token: string) => authServiceInstance.validateToken(token);
export const refreshToken = (token: string) => authServiceInstance.refreshToken(token);
export const getCurrentUser = (userId: string) => authServiceInstance.getCurrentUser(userId);
export const changePassword = (userId: string, oldPassword: string, newPassword: string) => authServiceInstance.changePassword(userId, oldPassword, newPassword);

// Alias for compatibility with routes
export const resetPassword = changePassword;

