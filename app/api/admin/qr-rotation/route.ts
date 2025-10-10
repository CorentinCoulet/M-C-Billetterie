import { NextRequest } from 'next/server';
import {
  NextApiResponse,
  withAdminAuth,
  createMethodHandler,
} from '../../../../src/lib/next-api-helpers';
import { logger } from '../../../../lib/logger';
import qrRotationService from '../../../../src/services/qrRotationService';

/**
 * POST /api/admin/qr-rotation
 * Run QR code rotation process (Admin only)
 */
async function handlePost(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      logger.info({ adminId: user.id }, 'Starting QR code rotation process');

      const result = await qrRotationService.runQRRotation();
      
      if (!result.success) {
        logger.error({ adminId: user.id, error: result.error, stats: result.stats }, 'QR rotation failed');
        
        return NextApiResponse.error(result.error || 'QR rotation failed', 500, {
          stats: result.stats,
        });
      }
      
      logger.info({ adminId: user.id, stats: result.stats }, 'QR rotation completed successfully');

      return NextApiResponse.success({
        message: 'QR code rotation completed successfully',
        stats: result.stats,
      });

    } catch (error) {
      logger.error({ error, adminId: user.id }, 'Error running QR rotation');
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
      logger.info({ adminId: user.id }, 'Fetching QR rotation statistics');

      const stats = await qrRotationService.getRotationStats();
      
      logger.info({ adminId: user.id, stats }, 'Rotation statistics retrieved');

      return NextApiResponse.success({ stats });

    } catch (error) {
      logger.error({ error, adminId: user.id }, 'Error getting rotation stats');
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
