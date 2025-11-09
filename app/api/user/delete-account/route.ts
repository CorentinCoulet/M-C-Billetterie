import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../src/lib/jwt'
import prisma from '../../../../src/lib/prisma'

interface JWTPayload {
  userId: string
  email: string
  role?: string
}

export async function DELETE(request: NextRequest) {
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

    // Delete user and all associated data (cascade)
    await prisma.user.delete({
      where: { id: payload.userId }
    })

    // Delete authentication cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

    response.cookies.delete('auth_token')

    return response
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
