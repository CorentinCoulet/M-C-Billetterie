import type { NextApiRequest, NextApiResponse } from 'next';
import * as ticketService from './ticket.service';

export async function list(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tickets = await ticketService.list();
    res.status(200).json(tickets);
  } catch {
    res.status(500).json({ message: 'Erreur lors de la récupération des tickets.' });
  }
}

export async function create(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ticket = await ticketService.create(req.body);
    res.status(201).json(ticket);
  } catch {
    res.status(400).json({ message: 'Erreur lors de la création du ticket.' });
  }
}