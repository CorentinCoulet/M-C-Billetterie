import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/categories
 * Récupère la liste de toutes les catégories
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: { events: true }
        }
      }
    })

    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      eventCount: cat._count.events
    }))

    return NextResponse.json({
      success: true,
      data: formattedCategories
    })
  } catch (error) {
    logger.error('Erreur lors de la récupération des catégories', { error })
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * Crée une nouvelle catégorie (admin uniquement)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Le nom de la catégorie est requis' },
        { status: 400 }
      )
    }

    // Vérifier si la catégorie existe déjà
    const existing = await prisma.category.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Cette catégorie existe déjà' },
        { status: 409 }
      )
    }

    const category = await prisma.category.create({
      data: { name: name.trim() }
    })

    logger.info('Catégorie créée', { categoryId: category.id, name: category.name })

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 })
  } catch (error) {
    logger.error('Erreur lors de la création de la catégorie', { error })
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
