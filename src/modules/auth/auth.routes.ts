import { NextApiRequest, NextApiResponse } from 'next';
import authController from './auth.controller';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      // Determine which action to take based on the endpoint
      const action = req.query.action as string;

      switch (action) {
        case 'register':
          return authController.register(req, res);
        case 'login':
          return authController.login(req, res);
        case 'logout':
          return authController.logout(req, res);
        case 'change-password':
          return authController.changePassword(req, res);
        case 'request-reset':
          return authController.requestPasswordReset(req, res);
        case 'reset-password':
          return authController.resetPassword(req, res);
        default:
          return res.status(400).json({ message: 'Invalid action' });
      }

    case 'GET':
      // Only one GET endpoint for getting the current user
      return authController.getCurrentUser(req, res);

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}