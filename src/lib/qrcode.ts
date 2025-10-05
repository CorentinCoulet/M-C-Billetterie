import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface TicketData {
  id: string;
  orderId: string;
  eventId: string;
  userId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  seatInfo?: string;
  issuedAt: string;
  validUntil: string;
  currentQRCode?: string;
  qrCodeGeneratedAt?: string;
  isScanned?: boolean;
  scannedAt?: string;
  qrRotationInterval?: number; 
}

export interface QRCodeConfig {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateTicketQRCode(
  ticketData: Omit<TicketData, 'id' | 'issuedAt'>,
  config: QRCodeConfig = {}
): Promise<{ ticketId: string; qrCodeDataURL: string; ticketData: TicketData }> {
  
  const ticketId = uuidv4();
  const issuedAt = new Date().toISOString();
  
  const completeTicketData: TicketData = {
    ...ticketData,
    id: ticketId,
    issuedAt,
  };

  const qrPayload = {
    ticketId,
    eventId: ticketData.eventId,
    userId: ticketData.userId,
    issuedAt,
    checksum: generateChecksum(completeTicketData),
  };

  const qrConfig = {
    width: config.size || parseInt(process.env.QR_CODE_SIZE || '200'),
    margin: config.margin || parseInt(process.env.QR_CODE_MARGIN || '4'),
    color: {
      dark: config.color?.dark || '#000000',
      light: config.color?.light || '#FFFFFF',
    },
  };

  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrPayload), qrConfig);
    
    return {
      ticketId,
      qrCodeDataURL,
      ticketData: completeTicketData,
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function verifyRotatingQRCode(qrContent: string, ticketData?: TicketData): { 
  isValid: boolean; 
  ticketData?: object; 
  error?: string;
  needsRegeneration?: boolean;
  canBeScanned?: boolean;
} {
  try {
    const payload = JSON.parse(qrContent);
    
    if (!payload.ticketId || !payload.eventId || !payload.userId || !payload.rotationToken || !payload.generatedAt || !payload.checksum) {
      return { isValid: false, error: 'Invalid rotating QR code format' };
    }

    if (ticketData) {
      if (payload.ticketId !== ticketData.id) {
        return { isValid: false, error: 'QR code does not match ticket' };
      }

      if (ticketData.isScanned) {
        return { 
          isValid: false, 
          error: 'Ticket has already been scanned and used',
          canBeScanned: false
        };
      }

      const qrGeneratedAt = new Date(payload.generatedAt);
      const now = new Date();
      const rotationInterval = ticketData.qrRotationInterval || 12;
      const diffHours = (now.getTime() - qrGeneratedAt.getTime()) / (1000 * 60 * 60);

      if (diffHours >= rotationInterval) {
        return { 
          isValid: false, 
          error: 'QR code has expired and needs regeneration',
          needsRegeneration: true,
          canBeScanned: false
        };
      }

      const expectedChecksum = generateRotatingChecksum(ticketData, payload.rotationToken, payload.generatedAt);
      if (payload.checksum !== expectedChecksum) {
        return { isValid: false, error: 'Invalid QR code checksum' };
      }

      return { 
        isValid: true, 
        ticketData: {
          ...payload,
          ticketInfo: ticketData
        },
        canBeScanned: true
      };
    }

    return { 
      isValid: true, 
      ticketData: payload,
      canBeScanned: true
    };
    
  } catch {
    return { 
      isValid: false, 
      error: 'Invalid QR code content' 
    };
  }
}

function generateChecksum(ticketData: TicketData): string {
  const dataString = `${ticketData.id}${ticketData.eventId}${ticketData.userId}${ticketData.issuedAt}`;
  
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

export async function generateOrderTickets(
  orderData: {
    orderId: string;
    eventId: string;
    userId: string;
    eventTitle: string;
    eventDate: string;
    venue: string;
    quantity: number;
    validUntil: string;
  },
  config?: QRCodeConfig
): Promise<Array<{ ticketId: string; qrCodeDataURL: string; ticketData: TicketData }>> {
  
  const tickets = [];
  
  for (let i = 0; i < orderData.quantity; i++) {
    const ticketData = {
      orderId: orderData.orderId,
      eventId: orderData.eventId,
      userId: orderData.userId,
      eventTitle: orderData.eventTitle,
      eventDate: orderData.eventDate,
      venue: orderData.venue,
      seatInfo: `Ticket #${i + 1}`,
      validUntil: orderData.validUntil,
    };
    
    const ticket = await generateTicketQRCode(ticketData, config);
    tickets.push(ticket);
  }
  
  return tickets;
}

export function shouldRegenerateQRCode(ticketData: TicketData): boolean {
  if (ticketData.isScanned) {
    return false;
  }

  if (!ticketData.qrCodeGeneratedAt) {
    return true;
  }

  const generatedAt = new Date(ticketData.qrCodeGeneratedAt);
  const now = new Date();
  const rotationInterval = ticketData.qrRotationInterval || 12;
  const diffHours = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60);

  return diffHours >= rotationInterval;
}

export async function generateOrUpdateQRCode(
  ticketData: TicketData,
  config: QRCodeConfig = {}
): Promise<{ ticketId: string; qrCodeDataURL: string; ticketData: TicketData }> {
  
  if (ticketData.isScanned) {
    return {
      ticketId: ticketData.id,
      qrCodeDataURL: ticketData.currentQRCode || '',
      ticketData,
    };
  }

  const rotationToken = uuidv4();
  const qrCodeGeneratedAt = new Date().toISOString();

  const qrPayload = {
    ticketId: ticketData.id,
    eventId: ticketData.eventId,
    userId: ticketData.userId,
    rotationToken,
    generatedAt: qrCodeGeneratedAt,
    checksum: generateRotatingChecksum(ticketData, rotationToken, qrCodeGeneratedAt),
  };

  const qrConfig = {
    width: config.size || parseInt(process.env.QR_CODE_SIZE || '200'),
    margin: config.margin || parseInt(process.env.QR_CODE_MARGIN || '4'),
    color: {
      dark: config.color?.dark || '#000000',
      light: config.color?.light || '#FFFFFF',
    },
  };

  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrPayload), qrConfig);
    
    const updatedTicketData: TicketData = {
      ...ticketData,
      currentQRCode: qrCodeDataURL,
      qrCodeGeneratedAt,
    };

    return {
      ticketId: ticketData.id,
      qrCodeDataURL,
      ticketData: updatedTicketData,
    };
  } catch (error) {
    throw new Error(`Failed to generate rotating QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function markTicketAsScanned(ticketData: TicketData): TicketData {
  return {
    ...ticketData,
    isScanned: true,
    scannedAt: new Date().toISOString(),
  };
}

function generateRotatingChecksum(ticketData: TicketData, rotationToken: string, generatedAt: string): string {
  const dataString = `${ticketData.id}${ticketData.eventId}${ticketData.userId}${rotationToken}${generatedAt}`;
  
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}
