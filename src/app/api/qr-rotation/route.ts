import { getQRRotationStats, isQRRotationRunning, triggerManualQRRotation } from '@/lib/qr-rotation-service';
import { NextResponse } from 'next/server';

/**
 * GET /api/qr-rotation - Récupérer les statistiques de rotation des QR codes
 */
export async function GET() {
  try {
    const stats = getQRRotationStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting QR rotation stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get QR rotation statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qr-rotation - Déclencher manuellement la rotation des QR codes
 */
export async function POST() {
  try {
    // Check if rotation is already in progress
    if (isQRRotationRunning()) {
      return NextResponse.json(
        {
          success: false,
          error: 'QR rotation is already in progress',
        },
        { status: 409 }
      );
    }

    console.log('📍 Manual QR rotation triggered via API');
    const result = await triggerManualQRRotation();
    
    return NextResponse.json({
      success: result.success,
      data: result.stats,
      error: result.error,
    });
  } catch (error) {
    console.error('Error triggering QR rotation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger QR rotation',
      },
      { status: 500 }
    );
  }
}
