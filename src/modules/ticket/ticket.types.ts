// Types spécifiques au module ticket

export interface CreateTicketRequest {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  eventId: string;
  type?: string;
  seatNumber?: string;
}

export interface UpdateTicketRequest {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  type?: string;
}

export interface TicketFilter {
  eventId?: string;
  type?: string;
  available?: boolean;
}
