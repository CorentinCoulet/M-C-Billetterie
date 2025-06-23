import { EventStatus } from '../../enums/event.enum';

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  capacity?: number;
  price?: number;
  status?: EventStatus;
  imageUrl?: string;
}
