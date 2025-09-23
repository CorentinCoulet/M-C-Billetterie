import { NextRequest, NextResponse } from 'next/server';
import ticketService from '../../../../src/services/ticketQRService';

/**
 * POST /api/tickets/validate
 * Validate a QR code and optionally mark ticket as used
 */
export async function POST(request: NextRequest) {
  try {
    const { qrContent, markAsUsed = false } = await request.json();
    
    if (!qrContent) {
      return NextResponse.json(
        { error: 'QR content is required' },
        { status: 400 }
      );
    }

    const validation = await ticketService.validateTicketQRCode(qrContent, markAsUsed);
    
    // Return appropriate status code based on validation result
    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: validation.error,
          canBeScanned: validation.canBeScanned || false 
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      valid: true,
      ticket: {
        id: validation.ticket?.id,
        eventId: validation.ticket?.eventId,
        eventTitle: validation.ticket?.event?.title,
        eventDate: validation.ticket?.event?.date,
        isScanned: validation.ticket?.isScanned,
        scannedAt: validation.ticket?.scannedAt,
        userEmail: validation.ticket?.user?.email,
      },
      isAlreadyScanned: validation.isAlreadyScanned,
      canBeScanned: validation.canBeScanned,
      message: validation.isAlreadyScanned 
        ? 'Ticket was already scanned' 
        : markAsUsed 
          ? 'Ticket validated and marked as used'
          : 'Ticket is valid'
    });

  } catch (error) {
    console.error('QR validation error:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal validation error' 
      },
      { status: 500 }
    );
  }
}
