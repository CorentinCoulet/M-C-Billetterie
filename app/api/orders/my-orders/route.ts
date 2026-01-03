import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../src/lib/jwt'
import prisma from '../../../../src/lib/prisma'

interface JWTPayload {
  userId: string
  email: string
  role?: string
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const payload = verifyToken<JWTPayload>(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Fetch user orders (limited data for performance)
    const orders = await prisma.order.findMany({
      where: {
        userId: payload.userId
      },
      select: {
        id: true,
        totalPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        tickets: {
          select: {
            id: true,
            price: true,
            status: true,
            event: {
              select: {
                id: true,
                title: true,
                date: true,
                location: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 orders for performance
    })

    return NextResponse.json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
