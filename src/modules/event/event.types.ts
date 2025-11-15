// Types spécifiques au module event

export interface CreateEventRequest {
  title: string;
  description?: string;
  date: Date;
  location: string;
  capacity: number;
  organizerId: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  date?: Date;
  location?: string;
  capacity?: number;
}

export interface EventFilter {
  organizerId?: string;
  location?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isPublished?: boolean;
}
