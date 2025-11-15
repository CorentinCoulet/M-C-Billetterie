// Types spécifiques au module order

export interface CreateOrderRequest {
  tickets: Array<{
    ticketId: string;
    quantity: number;
  }>;
  userId: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface UpdateOrderRequest {
  status?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface OrderFilter {
  userId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
