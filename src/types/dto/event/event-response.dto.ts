import { EventStatus } from '../../enums/event.enum';

export interface EventResponseDto {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  organizerId: string;
  organizerName: string;
  status: EventStatus;
  capacity: number;
  ticketsSold: number;
  price: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
