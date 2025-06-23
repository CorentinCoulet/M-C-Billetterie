import { TicketStatus } from '../../enums/ticket-status.enum';

export interface CreateTicketDto {
  eventId: string;
  userId: string;
  price: number;
  status?: TicketStatus;
}
