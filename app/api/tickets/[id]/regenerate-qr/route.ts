import { NextRequest, NextResponse } from 'next/server';
import ticketService from '../../../../../src/services/ticketQRService';

/**
 * POST /api/tickets/[id]/regenerate-qr
 * Regenerate QR code for a ticket
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id;
    
    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Check if ticket exists and is not already scanned
    const existingTicket = await ticketService.getTicketById(ticketId);
    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (existingTicket.isScanned) {
      return NextResponse.json(
        { error: 'Cannot regenerate QR code for already used ticket' },
        { status: 400 }
      );
    }

    // Generate new QR code
    const qrResult = await ticketService.generateTicketQRCode(ticketId);
    
    return NextResponse.json({
      success: true,
      message: 'QR code regenerated successfully',
      qrCode: qrResult.qrCodeDataUrl,
      generatedAt: new Date().toISOString(),
      ticket: {
        id: ticketId,
        eventId: existingTicket.eventId
      }
    });

  } catch (error) {
    console.error('QR regeneration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to regenerate QR code' 
      },
      { status: 500 }
    );
  }
}
