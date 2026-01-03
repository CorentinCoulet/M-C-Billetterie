import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../src/lib/jwt'
import prisma from '../../../../src/lib/prisma'

interface JWTPayload {
  userId: string
  email: string
  role?: string
}

interface UserMetadata {
  consents?: {
    marketing?: boolean
    analytics?: boolean
    thirdParty?: boolean
    updatedAt?: string
  }
  [key: string]: unknown
}

// GET: Retrieve current consent settings
export async function GET(request: NextRequest) {
  try {
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { metadata: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const metadata = (user.metadata as UserMetadata) || {}
    const consents = metadata.consents || {
      marketing: false,
      analytics: true,
      thirdParty: false,
      updatedAt: null
    }

    return NextResponse.json({
      success: true,
      data: consents
    })
  } catch (error) {
    console.error('Error fetching consents:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}

// PUT: Update consent settings
export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { marketing, analytics, thirdParty } = body

    // Get current user metadata
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { metadata: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const currentMetadata = (user.metadata as UserMetadata) || {}
    
    // Update consents in metadata
    const updatedMetadata = {
      ...currentMetadata,
      consents: {
        marketing: Boolean(marketing),
        analytics: Boolean(analytics),
        thirdParty: Boolean(thirdParty),
        updatedAt: new Date().toISOString()
      }
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { metadata: updatedMetadata as object }
    })

    return NextResponse.json({
      success: true,
      message: 'Consent settings updated successfully',
      data: updatedMetadata.consents
    })
  } catch (error) {
    console.error('Error updating consents:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
