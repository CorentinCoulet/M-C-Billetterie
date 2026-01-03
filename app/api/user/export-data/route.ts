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
        metadata: true,
        cartItems: {
          select: {
            id: true,
            eventName: true,
            quantity: true,
            price: true,
            addedAt: true,
          }
        },
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
        },
        notifications: {
          select: {
            id: true,
            type: true,
            message: true,
            isRead: true,
            sentAt: true,
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
    const userMetadata = (user.metadata as Record<string, unknown>) || {}
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        userId: user.id,
        dataProtectionNotice: 'This data is exported in accordance with GDPR Article 20 (Right to data portability)',
        disclaimer: 'This export contains only your personal data. Please keep this file secure.'
      },
      personalInformation: {
        id: user.id,
        email: user.email,
        name: user.name,
        // Don't expose role for security reasons - removed
        accountCreatedAt: user.createdAt,
        accountUpdatedAt: user.updatedAt,
      },
      preferences: {
        consents: userMetadata.consents || null,
      },
      // Use user-friendly names instead of database table names
      shoppingCart: user.cartItems,
      purchaseHistory: user.orders,
      eventFeedback: user.reviews,
      messages: user.notifications,
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
