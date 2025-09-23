import { NextRequest, NextResponse } from 'next/server';
import qrRotationService from '../../../../src/services/qrRotationService';

/**
 * POST /api/admin/qr-rotation
 * Run QR code rotation process
 */
export async function POST(request: NextRequest) {
  try {
    const result = await qrRotationService.runQRRotation();
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          stats: result.stats 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'QR code rotation completed successfully',
      stats: result.stats
    });

  } catch (error) {
    console.error('Error running QR rotation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to run QR rotation' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/qr-rotation
 * Get QR rotation statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await qrRotationService.getRotationStats();
    
    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting rotation stats:', error);
    return NextResponse.json(
      { error: 'Failed to get rotation statistics' },
      { status: 500 }
    );
  }
}
