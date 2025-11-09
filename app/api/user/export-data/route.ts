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
    const token = request.cookies.get('auth_token')?.value
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

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            tickets: {
              select: {
                id: true,
                status: true,
                event: {
                  select: {
                    title: true,
                    date: true,
                    location: true,
                  }
                }
              }
            }
          }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            event: {
              select: {
                title: true,
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare data for export (GDPR)
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        userId: user.id,
        dataProtectionNotice: 'This data is exported in accordance with GDPR Article 20 (Right to data portability)'
      },
      personalInformation: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountCreatedAt: user.createdAt,
        accountUpdatedAt: user.updatedAt,
      },
      orders: user.orders,
      reviews: user.reviews,
    }

    // Create JSON file
    const jsonContent = JSON.stringify(exportData, null, 2)
    const buffer = Buffer.from(jsonContent, 'utf-8')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="my-data-${user.id}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
