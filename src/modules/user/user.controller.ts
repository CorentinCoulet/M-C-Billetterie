import { AuthenticatedRequest } from '@/middlewares/auth';
import { NextApiResponse } from 'next';
import { z } from 'zod';
import * as userService from './user.service';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
});

export async function list(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const users = await userService.list();
    return res.status(200).json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = parseInt(req.query.id as string, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Only admins can access other user profiles
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const user = await userService.getById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function updateById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = parseInt(req.query.id as string, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Only admins can update other user profiles
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }
    
    const updatedUser = await userService.updateById(userId, parseResult.data);
    return res.status(200).json(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function deleteById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const userId = parseInt(req.query.id as string, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    await userService.deleteById(userId);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getProfile(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = await userService.getById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }
    
    const updatedUser = await userService.updateById(req.user.id, parseResult.data);
    return res.status(200).json(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getStats(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const stats = await userService.getStats(req.user.id);
    return res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}