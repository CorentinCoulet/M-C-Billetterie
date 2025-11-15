import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
    createMethodHandler,
    NextApiResponse,
    withAdminAuth,
} from '@/lib/next-api-helpers';
import qrRotationService from '@/services/qrRotationService';

/**
 * POST /api/admin/qr-rotation
 * Run QR code rotation process (Admin only)
 */
async function handlePost(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      logger.info('Starting QR code rotation process', { adminId: user.id });

      const result = await qrRotationService.runQRRotation();
      
      if (!result.success) {
        logger.error('QR rotation failed', { adminId: user.id, error: result.error, stats: result.stats });

        return NextApiResponse.error(result.error || 'QR rotation failed', 500, {
          stats: result.stats,
        });
      }
      
      logger.info('QR rotation completed successfully', { adminId: user.id, stats: result.stats });

      return NextApiResponse.success({
        message: 'QR code rotation completed successfully',
        stats: result.stats,
      });

    } catch (error) {
      logger.error('Error running QR rotation', { error, adminId: user.id });
      return NextApiResponse.error('Failed to run QR rotation', 500);
    }
  });
}

/**
 * GET /api/admin/qr-rotation
 * Get QR rotation statistics (Admin only)
 */
async function handleGet(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      logger.info('Fetching QR rotation statistics', { adminId: user.id });

      const stats = await qrRotationService.getRotationStats();
      
      logger.info('Rotation statistics retrieved', { adminId: user.id, stats });

      return NextApiResponse.success({ stats });

    } catch (error) {
      logger.error('Error getting rotation stats', { error, adminId: user.id });
      return NextApiResponse.error('Failed to get rotation statistics', 500);
    }
  });
}

export const GET = createMethodHandler({
  GET: handleGet,
});

export const POST = createMethodHandler({
  POST: handlePost,
});
