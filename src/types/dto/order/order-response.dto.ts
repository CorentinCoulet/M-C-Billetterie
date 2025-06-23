import { OrderStatus } from '../../enums/order-status.enum';
import { TicketResponseDto } from '../ticket/ticket-response.dto';

export interface OrderResponseDto {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  tickets: TicketResponseDto[];
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
