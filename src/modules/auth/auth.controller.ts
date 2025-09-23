import { AuthService } from '../../services/authService';

const authService = new AuthService();

/**
 * Login user
 */
export const login = async (email: string, password: string) => {
  return await authService.login(email, password);
};

/**
 * Register user
 */
export const register = async (userData: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) => {
  return await authService.register(
    userData.email,
    userData.password,
    userData.name
  );
};

/**
 * Verify token
 */
export const verifyToken = async (token: string) => {
  return await authService.validateToken(token);
};

/**
 * Logout user
 */
export const logout = async (userId: string) => {
  return await authService.logout(userId);
};

/**
 * Get current user
 */
export const getCurrentUser = async (userId: string) => {
  return await authService.getCurrentUser(userId);
};

/**
 * Change password
 */
export const changePassword = async (userId: string, oldPassword: string, newPassword: string) => {
  return await authService.changePassword(userId, oldPassword, newPassword);
};

export default {
  login,
  register,
  verifyToken,
  logout,
  getCurrentUser,
  changePassword,
};
