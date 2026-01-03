import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/venues
 * Récupère la liste de tous les lieux
 */
export async function GET(request: NextRequest) {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        capacity: true,
        _count: {
          select: { events: true }
        }
      }
    })

    const formattedVenues = venues.map(venue => ({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      capacity: venue.capacity,
      eventCount: venue._count.events
    }))

    return NextResponse.json({
      success: true,
      data: formattedVenues
    })
  } catch (error) {
    logger.error('Erreur lors de la récupération des lieux', { error })
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/venues
 * Crée un nouveau lieu
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, capacity } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Le nom du lieu est requis' },
        { status: 400 }
      )
    }

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'L\'adresse du lieu est requise' },
        { status: 400 }
      )
    }

    if (typeof capacity !== 'number' || capacity < 1) {
      return NextResponse.json(
        { success: false, error: 'La capacité doit être un nombre positif' },
        { status: 400 }
      )
    }

    const venue = await prisma.venue.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        capacity
      }
    })

    logger.info('Lieu créé', { venueId: venue.id, name: venue.name })

    return NextResponse.json({
      success: true,
      data: venue
    }, { status: 201 })
  } catch (error) {
    logger.error('Erreur lors de la création du lieu', { error })
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
