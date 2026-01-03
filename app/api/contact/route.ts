import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  subject: z.string().min(5, 'Le sujet doit contenir au moins 5 caractères'),
  message: z.string().min(20, 'Le message doit contenir au moins 20 caractères'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Données invalides',
          errors: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = result.data;

    // Log the contact message
    logger.info({
      type: 'contact_form',
      name,
      email,
      subject,
      messageLength: message.length,
    }, 'New contact form submission');

    // In production, you would:
    // 1. Send an email to the support team
    // 2. Store the message in the database
    // 3. Send a confirmation email to the user
    
    // For now, we just log and return success
    // TODO: Implement email sending with nodemailer or similar
    
    // Optional: Store in database if you have a Contact model
    // await prisma.contactMessage.create({
    //   data: { name, email, subject, message }
    // });

    return NextResponse.json({
      success: true,
      message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
    });
  } catch (error) {
    logger.error({ error }, 'Error processing contact form');
    return NextResponse.json(
      { success: false, message: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
