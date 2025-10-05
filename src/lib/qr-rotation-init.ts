// QR code rotation service initialization script
import { qrRotationService } from '@/lib/qr-rotation-service';

export function initializeQRRotationService() {
  // Start service only if enabled in environment variables
  if (process.env.ENABLE_QR_ROTATION === 'true') {
    console.log('🚀 Initializing QR rotation service...');
    
    try {
      qrRotationService.startRotationJob();
      console.log('✅ QR rotation service initialized successfully');
      
      // Show startup statistics
      const stats = qrRotationService.getStats();
      console.log('📊 QR rotation service stats:', {
        jobScheduled: stats.jobScheduled,
        lastRun: stats.lastJobRun,
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize QR rotation service:', error);
    }
  } else {
    console.log('⏭️ QR rotation service disabled (ENABLE_QR_ROTATION=false)');
  }
}

// Auto-initialization server-side only
if (typeof window === 'undefined') {
  initializeQRRotationService();
}
