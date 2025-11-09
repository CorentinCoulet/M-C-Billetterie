import { PrismaClient } from '@/src/generated/prisma';
import { verifyToken } from '@/src/lib/jwt';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken<JWTPayload>(token);
    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: decoded.userId },
      orderBy: { addedAt: 'desc' }
    });

    console.log('[cart:INFO] Cart retrieved', { userId: decoded.userId, itemCount: cartItems.length });

    return NextResponse.json({
      success: true,
      data: cartItems
    });

  } catch (error) {
    console.error('[cart:ERROR] Error fetching cart:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken<JWTPayload>(token);
    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { eventId, eventName, quantity, price } = await request.json();

    if (!eventId || !eventName || !quantity || !price) {
      return NextResponse.json(
        { success: false, message: 'Missing data' },
        { status: 400 }
      );
    }

    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_eventId: {
          userId: decoded.userId,
          eventId
        }
      }
    });

    let cartItem;

    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: {
          userId_eventId: {
            userId: decoded.userId,
            eventId
          }
        },
        data: {
          quantity: existing.quantity + quantity,
          price
        }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId: decoded.userId,
          eventId,
          eventName,
          quantity,
          price
        }
      });
    }

    console.log('[cart:INFO] Item added to cart', { userId: decoded.userId, eventId, quantity });

    return NextResponse.json({
      success: true,
      data: cartItem
    });

  } catch (error) {
    console.error('[cart:ERROR] Error adding to cart:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken<JWTPayload>(token);
    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    await prisma.cartItem.deleteMany({
      where: { userId: decoded.userId }
    });

    return NextResponse.json({
      success: true,
      message: 'Cart cleared'
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
