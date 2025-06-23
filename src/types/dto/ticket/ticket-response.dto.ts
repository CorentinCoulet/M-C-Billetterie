import { TicketStatus } from '../../enums/ticket-status.enum';

export interface TicketResponseDto {
  id: string;
  eventId: string;
  userId: string;
  price: number;
  status: TicketStatus;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}
