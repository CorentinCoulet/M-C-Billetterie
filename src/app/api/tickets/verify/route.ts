import { markTicketAsScanned, TicketData, verifyRotatingQRCode } from '@/lib/qrcode';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { qrContent, markAsUsed = false } = await request.json();

    if (!qrContent) {
      return NextResponse.json(
        { error: 'QR code content is required' },
        { status: 400 }
      );
    }

    // Mock ticket data for demo purposes
    // In a real project, retrieve from database
    const mockTicketData: TicketData = {
      id: 'ticket-demo-1',
      orderId: 'order-demo-1',
      eventId: 'event-demo-1',
      userId: 'user-demo-1',
      eventTitle: 'Concert Demo',
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      venue: 'Venue Demo',
      seatInfo: 'A1',
      issuedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      currentQRCode: undefined,
      qrCodeGeneratedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
      isScanned: false,
      scannedAt: undefined,
      qrRotationInterval: 12,
    };

    // Verify QR code with rotation logic
    const verification = verifyRotatingQRCode(qrContent, mockTicketData);

    if (!verification.isValid) {
      return NextResponse.json({
        valid: false,
        error: verification.error || 'Invalid ticket',
        needsRegeneration: verification.needsRegeneration || false,
        canBeScanned: verification.canBeScanned || false,
      });
    }

    // If markAsUsed is true, mark ticket as scanned
    let finalTicketData = mockTicketData;
    let wasScanned = false;
    
    if (markAsUsed && verification.canBeScanned) {
      finalTicketData = markTicketAsScanned(mockTicketData);
      wasScanned = true;
      
      // TODO: Save to database
      // await updateTicketInDatabase(finalTicketData);
      
      console.log(`✅ Ticket ${finalTicketData.id} marked as scanned`);
    }

    return NextResponse.json({
      valid: true,
      ticketData: verification.ticketData,
      message: wasScanned ? 'Ticket is valid and has been marked as used' : 'Ticket is valid',
      isScanned: wasScanned,
      canBeScanned: verification.canBeScanned,
      needsRegeneration: verification.needsRegeneration || false,
    });

  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json(
      { error: 'Failed to verify ticket' },
      { status: 500 }
    );
  }
}
